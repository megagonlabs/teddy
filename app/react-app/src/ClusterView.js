import React, { Component } from 'react';
import * as d3 from "d3";
import Table from 'react-bootstrap/Table';
import vegaEmbed from 'vega-embed';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import ClusterHist from './ClusterHist';

let _clusterCanvas = document.createElement('canvas');
let _clusterContext = _clusterCanvas.getContext('2d');
const vgEmbedOptions = { actions: false, renderer: 'svg', tooltip: false };

class ClusterView extends Component {
  constructor(props) {
    super(props);
    // this.layerClusters = [];
    this.state = {
      layerClusters: [],
      selectedClusterInfo: [],
      globalInfo: null,
      barScale: 1,
      clusterHistDistances: null,
      colHists: [ {}, {}, {} ]
    };

    this.selectedClusters = [];

    this.switchScale = this.switchScale.bind(this);
    this.switchLayer = this.switchLayer.bind(this);
  }

  componentDidMount() {
    this.loadLayer(this.props.bizId);
    this.loadGlobalInfo(this.props.bizId);

    window.fixTopWords = (reverse = false) => {
      const selectedClusterInfo = this.state.selectedClusterInfo;
      if (reverse) {
        this.loadTopWords(selectedClusterInfo[1].cid, selectedClusterInfo[0].cid, 1, true);
        this.loadTopWords(selectedClusterInfo[1].cid, selectedClusterInfo[0].cid, 2, true);
      } else {
        this.loadTopWords(selectedClusterInfo[0].cid, selectedClusterInfo[1].cid, 1, true);
        this.loadTopWords(selectedClusterInfo[0].cid, selectedClusterInfo[1].cid, 2, true);
      }
    };
  }

  loadLayer(bizId, nextCluster) {
    let _this = this;
    var centroids = process.env.REACT_APP_SERVER_ADDRESS + 'centroids/'
    let url = new URL(centroids);
    url.searchParams.append('biz_id', bizId);
    if (nextCluster) {
      const _layerClusters = [...this.state.layerClusters, nextCluster];
      url.searchParams.append('cid', _layerClusters.join('-'));
      this.setState({ layerClusters: _layerClusters });
    }
    d3.json(url).then(res => {
      // console.log(res);
      if (res.type == 'centroids') {
        _this.dataSamples = d3.csvParse(res.data);
        const margin = { top: 5, right: 5, bottom: 5, left: 5 }; // [Xiong] tweak this to control the plot position
        const outerHeight = this.visRef.clientHeight;
        const outerWidth = this.visRef.clientWidth;
        const height = outerHeight - margin.top - margin.bottom;
        const width = outerWidth - margin.left - margin.right;
        _this.width = width;
        _this.height = height;

        const container = d3.select('.cluster-vis');

        // Init Canvas
        d3.select(_clusterCanvas)
          .attr('width', width)
          .attr('height', height)
          .style('margin-left', margin.left + 'px')
          .style('margin-top', margin.top + 'px')
          .attr('class', 'canvas-plot');
        document.querySelector('.cluster-vis').append(_clusterCanvas);
        _this.canvasChart = d3.select(_clusterCanvas);

        // Init SVG
        const svgChart = container.append('svg:svg')
          .attr('width', outerWidth)
          .attr('height', outerHeight)
          .attr('class', 'svg-plot')
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);
        _this.svgChart = svgChart;

        _this.initScales();

        // Initial draw made with no zoom
        _this.draw();
      } else {
        // maybe draw points in the plot
        // console.log(d3.csvParse(res.data));
      }
    });
  }

  draw() {
    // this.dataSamples.forEach((point, i) => {
    //   this.drawPoint(this.x, this.y, point, 1, 1);
    // });

    let elemEnter = this.svgChart.selectAll('circle')
                    .data(this.dataSamples)
                    .enter()
                    .append('g');

    let circles = elemEnter.append('circle');

    circles
      .transition()
      .attr('class', 'cluster-circle')
      .attr('cx', d => this.x(parseFloat(d['pca_x'])))
      .attr('cy', d => this.y(parseFloat(d['pca_y'])))
      .attr('r', d => (parseFloat(d['_csize']) + 1) * 30)
      .style('stroke', '#bbb')
      .style('fill', d => d3.interpolateRdBu((parseFloat(d['weighted_mean_sentiment']) + 1) / 2));

    // [Xiong] refactor this part later if have time. Also there should be a more systematic way
    // to integrate the random bl.ocks code with ours, where they used d3.pack
    // see https://bl.ocks.org/mbostock/1846692
    elemEnter.append('text')
      .text(function(d) {
        const topwords = JSON.parse(d.topwords);
        return Object.keys(topwords)[0];
      })
      .style('font-size', function(d) {
        const r = (parseFloat(d['_csize']) + 1) * 30;
        return Math.min(2 * r, (2 * r - 8) / this.getComputedTextLength() * 10) + "px";
      })
      .attr('dx', d => {
        const r = (parseFloat(d['_csize']) + 1) * 30;
        return this.x(parseFloat(d['pca_x'])) - r / 2;
      })
      .attr('dy', d => {
        return this.y(parseFloat(d['pca_y'])) + 5;
      })
      .style('fill', '#153d52');


    const _this = this;
    // [Xiong] a very weird pattern so that we can pass the two "this" pointers
    // of two contexts
    this.svgChart.selectAll('circle')
      .on('mouseover', function(d) { clusterMouseOver(d, this, _this); })
      .on('mouseout', function(d) { clusterMouseOut(d, this, _this); })
      .on('click', function(d) { clusterMouseClick(d, this, _this); })
      .on('dblclick', function(d) { clusterMouseDblClick(d, this, _this); });
  }

  // only for canvas-based drawing
  drawPoint(scaleX, scaleY, point, k, alpha) {
    const pointColor = 'black';
    _clusterContext.beginPath();
    _clusterContext.fillStyle = '#bbb';
    _clusterContext.strokeStyle = '#bbb';
    const reduction = 'pca';
    const px = scaleX(parseFloat(point[`${reduction}_x`]));
    const py = scaleY(parseFloat(point[`${reduction}_y`]));
    console.log(px, py, this.lastSelection);

    if (this.lastSelection) {
      if (px > this.lastSelection.x1 && px < this.lastSelection.x2 &&
        py > this.lastSelection.y1 && py < this.lastSelection.y2) {
        _clusterContext.fillStyle = pointColor;
        _clusterContext.strokeStyle = pointColor;
      }
    } else {
      _clusterContext.fillStyle = pointColor;
      _clusterContext.strokeStyle = pointColor;
    }

    _clusterContext.globalAlpha = alpha;
    // const r = (k == 1) ? 2 : 2 * Math.log2(k);
    // const r = 3 * Math.log2(parseFloat(point['csize']));
    const r = (parseFloat(point['_csize']) + 1) * 30;
    // _clusterContext.arc(px, py, r, 0, 2 * Math.PI, true);
    // _clusterContext.stroke();
    // _clusterContext.fill();
  }

  initScales() {
    if (this.gxAxis) {
      this.gxAxis.remove();
    }

    if (this.gyAxis) {
      this.gyAxis.remove();
    }

    if (this.gxGridlines) {
      this.gxGridlines.remove();
    }

    if (this.gyGridlines) {
      this.gyGridlines.remove();
    }

    // Init Scales
    const reduction = 'pca';
    this.sampleRange = {
      x0: d3.min(this.dataSamples, (d) => parseFloat(d[`${reduction}_x`])) - 0.1,
      y0: d3.min(this.dataSamples, (d) => parseFloat(d[`${reduction}_y`])) - 0.1,
      x1: d3.max(this.dataSamples, (d) => parseFloat(d[`${reduction}_x`])) + 0.1,
      y1: d3.max(this.dataSamples, (d) => parseFloat(d[`${reduction}_y`])) + 0.1
    };
    this.x = d3.scaleLinear().domain([this.sampleRange.x0, this.sampleRange.x1]).range([0, this.width]).nice();
    this.y = d3.scaleLinear().domain([this.sampleRange.y0, this.sampleRange.y1]).range([this.height, 0]).nice();

    // Init Grids
    const xGridlines = d3.axisBottom()
      .tickFormat("")
      .tickSize(this.height)
      .scale(this.x);

    const yGridlines = d3.axisLeft()
      .tickFormat("")
      .tickSize(-this.width)
      .scale(this.y);

    // Add Grids
    this.gxGridlines = this.svgChart.append("g")
      .attr("class", "grid")
      .call(xGridlines);

    this.gyGridlines = this.svgChart.append("g")
      .attr("class", "grid")
      .call(yGridlines);
  }

  loadGlobalInfo(bizId) {
    var global_info_url = process.env.REACT_APP_SERVER_ADDRESS + 'global-info/';
    let url = new URL(global_info_url);
    url.searchParams.append('biz_id', bizId);
    const _this = this;
    d3.csv(url).then((res) => {
      let globalInfo = res[0];
      _this.setState({ globalInfo: {
        size: globalInfo.csize,
        avgCharLength: globalInfo.charLength,
        avgWordLength: globalInfo.wordLength,
        avgSentLength: globalInfo.sentLength
      }});
      this.loadTopWords(globalInfo.cid);
      this.loadTopWords(globalInfo.cid, null, 2);
      this.loadClusterHists(globalInfo.cid, 0);
      this.renderClusterBar(globalInfo, 0);
    });
  }

  selectCentroids(centroid, meta) {
    const nSelectedClusters = this.selectedClusters.length;
    const newInfo = {
      cid: centroid.cid,
      size: centroid.csize,
      avgCharLength: 0,
      avgWordLength: 0,
      avgSentLength: 0,
      i: centroid['cid'].split('-').reverse()[0]
    };
    if (meta) {
      if (nSelectedClusters == 0) {
        this.selectedClusters.push(centroid.cid);
        this.setState({
          selectedClusterInfo: [newInfo]
        });
        // request detail then render in col 1
        this.loadTopWords(centroid.cid);
        this.loadTopWords(centroid.cid, null, 2);
        this.loadClusterHists(centroid.cid, 1);
        this.renderClusterBar(centroid, 1);
        this.props.onSelectCluster(centroid.cid);
      } else if (nSelectedClusters == 1) {
        this.selectedClusters.push(centroid.cid);
        this.setState({
          selectedClusterInfo: [...this.state.selectedClusterInfo, newInfo]
        });
        // request detail then render in col 2
        this.loadTopWords(this.state.selectedClusterInfo[0].cid, centroid.cid);
        this.loadTopWords(this.state.selectedClusterInfo[0].cid, centroid.cid, 2);
        this.loadClusterHists(centroid.cid, 2);
        this.compareHists(this.state.selectedClusterInfo[0].cid, centroid.cid);
        this.renderClusterBar(centroid, 2);
        this.props.onSelectCluster(this.state.selectedClusterInfo[0].cid, centroid.cid);
      } else {
        // reset
        this.resetCircle();
        this.resetHists();
        this.selectedClusters = [centroid.cid];
        this.setState({
          selectedClusterInfo: [newInfo]
        });
        this.loadTopWords(centroid.cid);
        this.loadTopWords(centroid.cid, null, 2);
        this.loadClusterHists(centroid.cid, 1);
        this.renderClusterBar(centroid, 1);
        this.props.onSelectCluster(centroid.cid);
      }
    } else {
      this.resetCircle();
      this.resetHists();
      this.selectedClusters = [centroid.cid];
      this.setState({
        selectedClusterInfo: [newInfo]
      });
      this.loadTopWords(centroid.cid);
      this.loadTopWords(centroid.cid, null, 2);
      this.loadClusterHists(centroid.cid, 1);
      this.renderClusterBar(centroid, 1);
      this.props.onSelectCluster(centroid.cid);
    }
  }

  compareHists(cid1, cid2) {
    var histogram_comparison_url = process.env.REACT_APP_SERVER_ADDRESS + 'histogram-comparison/';
    let url = new URL(histogram_comparison_url);
    url.searchParams.append('biz_id', this.props.bizId);
    url.searchParams.append('cid1', cid1);
    url.searchParams.append('cid2', cid2);
    const _this = this;
    d3.json(url).then(res => {
      _this.setState({ clusterHistDistances: res });
    });
  }

  loadTopWords(cid1, cid2 = null, ngramsize = 1, fixed = false) {
    var cluster_topngrams_url = process.env.REACT_APP_SERVER_ADDRESS + 'cluster-topngrams/';
    let url = new URL(cluster_topngrams_url);
    url.searchParams.append('biz_id', this.props.bizId);
    url.searchParams.append('cid1', cid1);
    url.searchParams.append('ngramsize', ngramsize);
    url.searchParams.append('fixed', fixed ? 1 : 0);
    if (cid2) {
      url.searchParams.append('cid2', cid2);
    }

    const _this = this;
    d3.json(url).then(res => {
      // [Xiong] this is a very weird and hacky assertion here, which is due to double click
      // also triggers single click and we have some setState dependency hell here
      // re-visit and come up with a more elegant solution in the future
      if ((_this.selectedClusters.length == 0) && (cid1 != 'all')) {
        return;
      }

      // console.log(res);
      res.forEach((topwords, i) => {
        const topwordsKeys = fixed ? Object.keys(res[0]) : Object.keys(topwords);
        if ((cid1 != 'all') && (ngramsize == 1)){
          _this.props.onSetClusterTopwords(topwordsKeys);
        }
        let values = topwordsKeys.map(w => { return { word: w, score: topwords[w] } });
        let spec = {
          "data": {
            "values": values
          },
          "width": this.visRef.clientWidth * 0.2,
          "mark": "bar",
          "encoding": {
            "y": {"field": "word", "type": "ordinal", "title": ""},
            "x": {"field": "score", "type": "quantitative", "title": ""}
          },
          "config": {
            "xAxis": false,
            "labels": false
          }
        };

        if (!fixed) {
          spec.encoding.y.sort = { "sort": { "encoding": "x", "order": "descending" } };
        }

        if (cid1 === 'all') {
          vegaEmbed(`.topwords-g${ngramsize}-c0`, spec, vgEmbedOptions);
        } else {
          vegaEmbed(`.topwords-g${ngramsize}-c${i + 1}`, spec, vgEmbedOptions);
        }
      });
    });
  }

  loadClusterHists(cid, col) {
    var cluster_details_url = process.env.REACT_APP_SERVER_ADDRESS + 'cluster_details';
    let url = new URL(cluster_details_url);
    url.searchParams.append('biz_id', this.props.bizId);
    url.searchParams.append('cid', cid);
    const _this = this;
    d3.json(url).then(res => {
      // [Xiong] this is a very weird and hacky assertion here, which is due to double click
      // also triggers single click and we have some setState dependency hell here
      // re-visit and come up with a more elegant solution in the future
      if ((_this.selectedClusters.length == 0) && (col != 0)) {
        return;
      }

      if (cid === 'all') {

      } else {
        let _selectedClusterInfo = _this.state.selectedClusterInfo;
        _selectedClusterInfo[col - 1].avgCharLength = res.avgCharLength;
        _selectedClusterInfo[col - 1].avgWordLength = res.avgWordLength;
        _selectedClusterInfo[col - 1].avgSentLength = res.avgSentLength;
        _this.setState({ selectedClusterInfo: _selectedClusterInfo });
      }

      // histograms for attributes
      // window.attributes.forEach((attr, i) => {
      //   let values = [];
      //   res.hists[attr].forEach((y, j) => {
      //     values.push({ 'x': res.div[j], 'y': y });
      //   });

      //   let spec = {
      //     "data": {
      //       "values": values
      //     },
      //     "height": 50,
      //     "width": this.visRef.clientWidth * 0.2,
      //     "mark": "bar",
      //     "encoding": {
      //       "x": {"field": "x", "type": "ordinal", "title": ""},
      //       "y": {"field": "y", "type": "quantitative", "title": ""}
      //     },
      //     "config": {
      //       "axis": false,
      //       "labels": false
      //     }
      //   };

      //   vegaEmbed(`.attr-${i}-c${col}`, spec, vgEmbedOptions);
      // });
      let colHist = {};
      this.props.attributes.forEach((attr, i) => {
        colHist[attr] = (<ClusterHist key={cid} attr={attr} hist={res.hists[attr]} div={res.div} width={this.visRef.clientWidth * 0.2}/>);
      });
      let _colHists = _this.state.colHists;
      _colHists[col] = colHist;
      _this.setState({ colHists: _colHists });
    });
  }

  renderClusterBar(centroid, col) {
    let values = this.props.attributes.map((k) => {
      return {
        attribute: k,
        score: centroid[k],
        color: centroid[k] > 0 ? '#4c78a8': '#96312e'
      }
    });
    let spec = {
      "data": { "values": values },
      "mark": "bar",
      "width": 120,
      "autosize": {
        "type": "pad",
      },
      "encoding": {
        "y": {
          "field": "attribute",
          "type": "ordinal",
          "title": ""
        },
        "x": {
          "field": "score",
          "type": "quantitative",
          // "scale": { "domain": [-1, 1] },
          // "axis": {"title": "score"},
          "title": ""
        },
        "color": {
          "field": "color",
          "type": "nominal",
          "scale": null
        }
      }
    };

    vegaEmbed(`.centroid-bar-c${col}`, spec, vgEmbedOptions);
  }

  resetCircle() {
    this.svgChart
      .selectAll('circle')
      .style('stroke', '#ddd')
      .style('stroke-width', '1');
  }

  resetHists(clearAll) {
    this.setState({ colHists: [this.state.colHists[0], this.state.colHists[1], {}] });
    vegaEmbed('.topwords-g1-c2', {}, vgEmbedOptions);
    vegaEmbed('.topwords-g2-c2', {}, vgEmbedOptions);
    vegaEmbed('.centroid-bar-c2', {}, vgEmbedOptions);

    this.setState({ clusterHistDistances: null });

    if (clearAll) {
      this.setState({ colHists: [this.state.colHists[0], {}, {}] });
      vegaEmbed('.topwords-g1-c1', {}, vgEmbedOptions);
      vegaEmbed('.topwords-g2-c1', {}, vgEmbedOptions);
      vegaEmbed('.centroid-bar-c1', {}, vgEmbedOptions);
    }
  }

  resetCentroidBar() {
    this.selectedClusters = [];
    this.setState({ selectedClusterInfo: [] });
    vegaEmbed('.centroid-bar-c1', {}, vgEmbedOptions);
    vegaEmbed('.centroid-bar-c2', {}, vgEmbedOptions);
  }

  clearCircles() {
    this.svgChart.selectAll('circle').remove();
    this.svgChart.selectAll('text').remove();
  }

  switchScale(selectedKey, e) {
    e.preventDefault();
    this.setState({ barScale: selectedKey });
  }

  switchLayer(e) {
    e.preventDefault();
    let clickedLayer = parseInt(e.target.href.substring(window.location.origin.length + 1));
    let nextCluster = this.state.layerClusters[clickedLayer];
    // console.log(this.state.layerClusters.slice(0, parseInt(clickedLayer)), nextCluster);
    this.resetCentroidBar();
    this.props.onSelectCluster(-1, -1);
    this.clearCircles();
    if (clickedLayer != -1) {
      this.setState({ layerClusters: this.state.layerClusters.slice(0, parseInt(clickedLayer)) });
      this.forceUpdate(() => {
        this.loadLayer(this.props.bizId, nextCluster);
      });
    } else {
      this.setState({ layerClusters: [] });
      this.forceUpdate(() => {
        this.loadLayer(this.props.bizId);
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.bizId != nextProps.bizId) {
      console.log(`loading clusters for ${nextProps.bizId}`);
      this.clearCircles();
      this.resetHists(true);
      this.resetCentroidBar();
      this.loadLayer(nextProps.bizId);
      this.loadGlobalInfo(nextProps.bizId);
      this.setState({ layerClusters: [] });
    }
  }

  render() {
    const topActive = this.state.layerClusters.length == 0;
    const clusterInfo = this.state.selectedClusterInfo;
    const nSelectedClusters = clusterInfo.length;
    const globalInfo = this.state.globalInfo;
    const clusterHistDistances = this.state.clusterHistDistances;
    let sortedAttributes = [...this.props.attributes];
    if (clusterHistDistances) {
      sortedAttributes.sort((a, b) => clusterHistDistances[b] - clusterHistDistances[a]);
    }

    return (
      <div className="plot-col">
        <Breadcrumb className="layer-nav">
          <Breadcrumb.Item href="-1" onClick={this.switchLayer} active={topActive}>Top</Breadcrumb.Item>
          {
            this.state.layerClusters.map((c, l) => {
              const active = (l == this.state.layerClusters.length - 1);
              return (<Breadcrumb.Item href={`${l}`} active={active} onClick={this.switchLayer} key={l}>C{c}</Breadcrumb.Item>);
            })
          }
        </Breadcrumb>
        <div className="cluster-vis" ref={ e => this.visRef = e }></div>
        {/* ------------------------------------------------------------------------------------------------ */}
        <div className="cluster-info">
          <Table striped bordered size="sm" responsive="sm" className="cluster-info-table">
              <tbody>
                <tr>
                  <td style={{"userSelect": "none"}}>Entity Id</td>
                  <td>{ this.props.bizId }</td>
                </tr>
                <tr>
                  <td>Entity Name</td>
                  <td>{ this.props.hotelName }</td>
                </tr>
                <tr>
                  <td>Number of Reviews</td>
                  <td>{ this.props.rcount }</td>
                </tr>
              </tbody>
          </Table>
          <Table striped bordered size="sm" responsive="sm" className="cluster-comparison-table">
            <thead>
              <tr>
                <td style={{ width: '10%' }}></td>
                <td style={{ width: '30%' }}>All</td>
                <td style={{ width: '30%' }}>{ nSelectedClusters > 0 ? 'Cluster ' + parseInt(clusterInfo[0].i) : '' }</td>
                <td style={{ width: '30%' }}>{ nSelectedClusters > 1 ? 'Cluster ' + parseInt(clusterInfo[1].i) : '' }</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Size</td>
                <td>{ globalInfo ? parseInt(globalInfo.size) : '' }</td>
                <td>{ nSelectedClusters > 0 ? parseInt(clusterInfo[0].size) : '' }</td>
                <td>{ nSelectedClusters > 1 ? parseInt(clusterInfo[1].size) : '' }</td>
              </tr>
              <tr>
                <td>Avg# of Chars</td>
                <td>{ globalInfo ? parseInt(globalInfo.avgCharLength) : '' }</td>
                <td>{ nSelectedClusters > 0 ? parseInt(clusterInfo[0].avgCharLength) : '' }</td>
                <td>{ nSelectedClusters > 1 ? parseInt(clusterInfo[1].avgCharLength) : '' }</td>
              </tr>
              <tr>
                <td>Avg# of Words</td>
                <td>{ globalInfo ? parseInt(globalInfo.avgWordLength) : '' }</td>
                <td>{ nSelectedClusters > 0 ? parseInt(clusterInfo[0].avgWordLength) : '' }</td>
                <td>{ nSelectedClusters > 1 ? parseInt(clusterInfo[1].avgWordLength) : '' }</td>
              </tr>
              <tr>
                <td>Avg# of Sents</td>
                <td>{ globalInfo ? parseInt(globalInfo.avgSentLength) : '' }</td>
                <td>{ nSelectedClusters > 0 ? parseInt(clusterInfo[0].avgSentLength) : '' }</td>
                <td>{ nSelectedClusters > 1 ? parseInt(clusterInfo[1].avgSentLength) : '' }</td>
              </tr>
              <tr>
                <td>Top Words</td>
                <td><div className="topwords-g1-c0 vgl-vis"></div></td>
                <td><div className="topwords-g1-c1 vgl-vis"></div></td>
                <td><div className="topwords-g1-c2 vgl-vis"></div></td>
              </tr>
              <tr>
                <td>Top Bi-grams</td>
                <td><div className="topwords-g2-c0 vgl-vis"></div></td>
                <td><div className="topwords-g2-c1 vgl-vis"></div></td>
                <td><div className="topwords-g2-c2 vgl-vis"></div></td>
              </tr>
              {
                sortedAttributes.map((attr, i) => {
                  const style = clusterHistDistances ?
                  { backgroundColor: `rgba(255, 191, 107, ${0.75 * clusterHistDistances[attr]})` } :
                  { };
                  const colHists = this.state.colHists;
                  return (
                    <tr key={attr} style={style}>
                      <td>{attr}</td>
                      <td>
                        <div className={`attr-${i}-c0`}>{colHists[0][attr]}</div>
                      </td>
                      <td>
                        <div className={`attr-${i}-c1`}>{colHists[1][attr]}</div>
                      </td>
                      <td>
                        <div className={`attr-${i}-c2`}>{colHists[2][attr]}</div>
                      </td>
                    </tr>
                  )
                })
              }
              <tr>
                <td>Avg. Attributes</td>
                <td>
                  <div className="centroid-bar-c0"></div>
                </td>
                <td>
                  <div className="centroid-bar-c1"></div>
                </td>
                <td>
                  <div className="centroid-bar-c2"></div>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
    );
  }
}

function clusterMouseOver(d, circle, pane) {
  const r = (parseFloat(d['_csize']) + 1) * 30;
  d3.select(circle).transition().attr('r', r + 5).attr('fill-opacity', 0.5);
}

function clusterMouseOut(d, circle, pane) {
  const r = (parseFloat(d['_csize']) + 1) * 30;
  d3.select(circle).transition().attr('r', r).attr('fill-opacity', 1);
}

function clusterMouseClick(d, circle, pane) {
  console.log(JSON.parse(d.topwords));

  d3.select(circle)
    .transition()
    .attr('fill-opacity', 1)
    .style('stroke', '#ffbf6b')
    .style('stroke-width', '5');

  pane.selectCentroids(d, d3.event.metaKey);
}

function clusterMouseDblClick(d, circle, pane) {
  d3.select(circle)
    .transition()
    .duration(750)
    .attr('r', 1000)
    .attr('fill-opacity', 1)
    .on('end', () => {
      pane.clearCircles();
      pane.resetCentroidBar();
      pane.resetHists(true);
      pane.props.onSelectCluster(-1, -1);
      const ids = d['cid'].split('-');
      pane.loadLayer(pane.props.bizId, ids[ids.length - 1]);
    });
}

export default ClusterView;
