import React, { Component } from 'react';
import DataFrame from 'dataframe-js';
import * as d3 from "d3";
import DetailsPane from './DetailsPane';
import ClusterView from './ClusterView';

// [Xiong] this code is deprecated. This was for a preliminary investigation on the
// geometric zoom in, then we decided not to use it.

let _canvas = document.createElement('canvas');
let _context = _canvas.getContext('2d');
window.d3 = d3;
window.DataFrame = DataFrame;

class VisPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPoints: null
    };
    this.reduction = this.props.reduction;
  }

  updateDimensions() {
    // console.log(this.visRef.clientWidth);
    // console.log(this.visRef.clientHeight);
  }

  drawReviewPoints(reduction) {
    this.initScales();
    this.resetVis();
    // this.draw(d3.zoomIdentity);
  }

  componentDidMount() {
    // console.log(this.visRef.clientWidth);
    // console.log(this.visRef.clientHeight);
    let _this = this;
    d3.csv(this.props.dataUrl).then((dataSamples) => {
      window.d = dataSamples;
      _this.dataSamples = dataSamples;

      const margin = { top: 60, right: 15, bottom: 60, left: 100 };
      // const outerWidth = this.visRef.clientWidth;
      const outerHeight = this.visRef.clientHeight;
      const outerWidth = outerHeight;
      // const width = outerWidth - margin.left - margin.right;
      const height = outerHeight - margin.top - margin.bottom;
      const width = height;
      _this.width = width;
      _this.height = height;

      // const container = d3.select('.scatter-container');
      const container = d3.select('.vis');

      _this.lastTransform = null;
      _this.lastStretchedSelection = null;
      _this.lastSelection = null;

      // Init SVG
      const svgChart = container.append('svg:svg')
        .attr('width', outerWidth)
        .attr('height', outerHeight)
        .attr('class', 'svg-plot')
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
      _this.svgChart = svgChart;

      // Init Canvas
      d3.select(_canvas)
        .attr('width', width)
        .attr('height', height)
        .style('margin-left', margin.left + 'px')
        .style('margin-top', margin.top + 'px')
        .attr('class', 'canvas-plot');
      document.querySelector('.vis').append(_canvas);
      _this.canvasChart = d3.select(_canvas);

      this.initScales();

      // [Xiong] reference code on init scales and axes, I put them into a seperate function so that
      // we can re-init it after we change the reduction method
      // // Init Scales
      // const reduction = this.props.reduction;
      // // const x = d3.scaleLinear().domain([0, d3.max(dataExample, (d) => d[0])]).range([0, width]).nice();
      // // const y = d3.scaleLinear().domain([0, d3.max(dataExample, (d) => d[1])]).range([height, 0]).nice();
      // _this.x = d3.scaleLinear().domain([d3.min(dataExample, (d) => parseFloat(d[`${reduction}_x`])), d3.max(dataExample, (d) => parseFloat(d[`${reduction}_x`]))]).range([0, width]).nice();
      // _this.y = d3.scaleLinear().domain([d3.min(dataExample, (d) => parseFloat(d[`${reduction}_y`])), d3.max(dataExample, (d) => parseFloat(d[`${reduction}_y`]))]).range([height, 0]).nice();

      // // Init Axis
      // const xAxis = d3.axisBottom(_this.x);
      // const yAxis = d3.axisLeft(_this.y);
      // _this.xAxis = xAxis;
      // _this.yAxis = yAxis;

      // // Add Axis
      // _this.gxAxis = svgChart.append('g')
      //   .attr('transform', `translate(0, ${height})`)
      //   .call(xAxis);

      // _this.gyAxis = svgChart.append('g')
      //   .call(yAxis);
      // [Xiong] end of reference code

      // Add labels
      svgChart.append('text')
        .attr('x', `-${height / 2}`)
        .attr('dy', '-3.5em')
        .attr('transform', 'rotate(-90)')
        .text('Y');
      svgChart.append('text')
        .attr('x', `${width / 2}`)
        .attr('y', `${height + 40}`)
        .text('X');

      // Initial draw made with no zoom
      _this.draw(d3.zoomIdentity, true);

      _this.zoomTransform = d3.zoomIdentity;
      // Zoom/Drag handler
      const zoom_function = d3.zoom().scaleExtent([1, 1000])
        .on('zoom', () => {
          _this.brush_endEvent();
          _this.zoomTransform = d3.event.transform;
          _context.save();
          _this.draw(_this.zoomTransform);
          _context.restore();
        })
        .on('end', () => {
          console.log('zoom end');
          const xDomain = this.xAxis.scale().domain();
          const yDomain = this.yAxis.scale().domain();
          let url = new URL('http://127.0.0.1:5000/data-sample/');
          url.searchParams.append('x0', xDomain[0]);
          url.searchParams.append('x1', xDomain[1]);
          url.searchParams.append('y0', yDomain[0]);
          url.searchParams.append('y1', yDomain[1]);
          url.searchParams.append('reduction', this.props.reduction);
          _this.zoomTransform = d3.event.transform;
          console.log(_this.zoomTransform.k, d3.zoomIdentity.k);
          d3.csv(url).then((moreDataSamples) => {
            _this.dataSamples = moreDataSamples;
            _context.save();
            _this.draw(_this.zoomTransform, true);
            _context.restore();
          });
        });
      _this.zoom_function = zoom_function;

      _this.canvasChart.call(zoom_function);

      const brush = d3.brush().extent([[0, 0], [width, height]])
        .on("start", () => { _this.brush_startEvent(); })
        .on("brush", () => { _this.brush_brushEvent(); })
        .on("end", () => { _this.brush_endEvent(); })
        .on("start.nokey", () => {
          d3.select(window).on("keydown.brush keyup.brush", null);
        });
      _this.brush = brush;

      _this.brushSvg = svgChart
        .append("g")
        .attr("class", "brush")
        .call(brush);

      _this.brushStartPoint = null;
    });
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
    const reduction = this.reduction;
    this.sampleRange = {
      x0: d3.min(this.dataSamples, (d) => parseFloat(d[`${reduction}_x`])),
      y0: d3.min(this.dataSamples, (d) => parseFloat(d[`${reduction}_y`])),
      x1: d3.max(this.dataSamples, (d) => parseFloat(d[`${reduction}_x`])),
      y1: d3.max(this.dataSamples, (d) => parseFloat(d[`${reduction}_y`]))
    };
    this.x = d3.scaleLinear().domain([this.sampleRange.x0, this.sampleRange.x1]).range([0, this.width]).nice();
    this.y = d3.scaleLinear().domain([this.sampleRange.y0, this.sampleRange.y1]).range([this.height, 0]).nice();

    // Init Grids
    const xGridlines = d3.axisTop()
      .tickFormat("")
      .tickSize(-this.height, 0, 0)
      .scale(this.x);

    const yGridlines = d3.axisRight()
      .tickFormat("")
      .tickSize(this.width, 0, 0)
      .scale(this.y);

    // Add Grids
    this.gxGridlines = this.svgChart.append("g")
      .attr("class", "grid")
      .call(xGridlines);

    this.gyGridlines = this.svgChart.append("g")
      .attr("class", "grid")
      .call(yGridlines);

    // Init Axis
    const xAxis = d3.axisBottom(this.x);
    const yAxis = d3.axisLeft(this.y);
    this.xAxis = xAxis;
    this.yAxis = yAxis;

    // Add Axis
    this.gxAxis = this.svgChart.append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(xAxis);

    this.gyAxis = this.svgChart.append('g')
      .call(yAxis);
  }

  // Draw plot on canvas
  draw(transform, animate = false) {
    this.lastTransform = transform;

    const scaleX = transform.rescaleX(this.x);
    const scaleY = transform.rescaleY(this.y);

    this.gxAxis.call(this.xAxis.scale(scaleX));
    this.gyAxis.call(this.yAxis.scale(scaleY));

    _context.clearRect(0, 0, this.width, this.height);

    if (animate) {
      let startTime = null;
      const fadein = (time) => {
        if (!startTime) {
          startTime = time;
        }
        let elapsed = time - startTime;
        let alpha = elapsed > 500 ? 1 : 0.2 * elapsed / 100;
        _context.clearRect(0, 0, this.width, this.height);
        this.dataSamples.forEach((point, i) => {
            this.drawPoint(scaleX, scaleY, point, transform.k, alpha);
            // this.drawPoint(scaleX, scaleY, point, d3.zoomIdentity.k, alpha);
        });
        if (elapsed < 500) {
          requestAnimationFrame(fadein);
        }
      }
      requestAnimationFrame(fadein);
    } else {
      _context.clearRect(0, 0, this.width, this.height);
      this.dataSamples.forEach((point, i) => {
          this.drawPoint(scaleX, scaleY, point, transform.k, 1);
      });
    }
  }

  drawPoint(scaleX, scaleY, point, k, alpha) {
    // const pointColor = '#4c78a8';
    const pointColor = d3.interpolateRdBu((parseFloat(point['sentiment']) + 1) / 2); // [Xiong] the sentiment score is in [-1, 1] and d3 color interpolation takes an input of [0, 1]
    _context.beginPath();
    // _context.lineWidth = 2;
    _context.fillStyle = '#bbb';
    _context.strokeStyle = '#bbb';
    const reduction = this.reduction;
    const px = scaleX(parseFloat(point[`${reduction}_x`]));
    const py = scaleY(parseFloat(point[`${reduction}_y`]));
    // console.log(px, py, this.lastSelection);

    if (this.lastSelection) {
      if (px > this.lastSelection.x1 && px < this.lastSelection.x2 &&
        py > this.lastSelection.y1 && py < this.lastSelection.y2) {
        _context.fillStyle = pointColor;
        _context.strokeStyle = pointColor;
      }
    } else {
      _context.fillStyle = pointColor;
      _context.strokeStyle = pointColor;
    }

    _context.globalAlpha = alpha;
    const r = (k == 1) ? 2 : 2 * Math.log2(k);
    _context.arc(px, py, r, 0, 2 * Math.PI, true);
    // _context.stroke();
    _context.fill();
  }

  brush_startEvent() {
    this.brushSvg.call(this.brush.move, null);
    this.lastStretchedSelection = null;
    this.lastSelection = null;

    const sourceEvent = d3.event.sourceEvent;
    const selection = d3.event.selection;
    if (sourceEvent.type === 'mousedown') {
      this.brushStartPoint = {
        mouse: {
          x: sourceEvent.screenX,
          y: sourceEvent.screenY
        },
        x: selection[0][0],
        y: selection[0][1]
      }
    } else {
      this.brushStartPoint = null;
    }
  }

  brush_brushEvent() {
    const brushStartPoint = this.brushStartPoint;
    if (brushStartPoint !== null) {
      const scale = this.width / this.height;
      const sourceEvent = d3.event.sourceEvent;
      const mouse = {
        x: sourceEvent.screenX,
        y: sourceEvent.screenY
      };
      if (mouse.x < 0) { mouse.x = 0; }
      if (mouse.y < 0) { mouse.y = 0; }
      let distance = mouse.y - brushStartPoint.mouse.y;
      let yPosition = brushStartPoint.y + distance;
      let xCorMulti = 1;

      if ((distance < 0 && mouse.x > brushStartPoint.mouse.x) || (distance > 0 && mouse.x < brushStartPoint.mouse.x)) {
        xCorMulti = -1;
      }

      if (yPosition > this.height) {
        distance = this.height - brushStartPoint.y;
        yPosition = this.height;
      } else if (yPosition < 0) {
        distance = -brushStartPoint.y;
        yPosition = 0;
      }

      let xPosition = brushStartPoint.x + distance * scale * xCorMulti;
      const oldDistance = distance;

      if (xPosition > this.width) {
        distance = (this.width - brushStartPoint.x) / scale;
        xPosition = this.width;
      } else if (xPosition < 0) {
        distance = brushStartPoint.x / scale;
        xPosition = 0;
      }

      if (oldDistance !== distance) {
        distance *= (oldDistance < 0) ? -1 : 1;
        yPosition = brushStartPoint.y + distance;
      }

      const selection = this.svgChart.select(".selection");

      // [Xiong] commented the following line because I want to enable the selection of any size,
      // not to be bound with the canvas scale
      // const posValue = Math.abs(distance);
      // selection.attr('width', posValue * scale).attr('height', posValue);

      if (xPosition < brushStartPoint.x) {
        selection.attr('x', xPosition);
      }
      if (yPosition < brushStartPoint.y) {
        selection.attr('y', yPosition);
      }

      const minX = Math.min(brushStartPoint.x, xPosition);
      const maxX = Math.max(brushStartPoint.x, xPosition);
      const minY = Math.min(brushStartPoint.y, yPosition);
      const maxY = Math.max(brushStartPoint.y, yPosition);

      this.lastStretchedSelection = { x1: minX, x2: maxX, y1: minY, y2: maxY };
    }
  }

  brush_endEvent() {
    // [Xiong] the lastStretchedSelection here is for re-paint the zoomed in canvas
    const s = d3.event.selection;
    const lastStretchedSelection = this.lastStretchedSelection;
    // console.log('lastStretchedSelection', lastStretchedSelection);

    if (!s && lastStretchedSelection !== null) {
      // Re-scale axis for the last transformation
      let zx = this.lastTransform.rescaleX(this.x);
      let zy = this.lastTransform.rescaleY(this.y);

      // Calc distance on Axis-X to use in scale
      let totalX = Math.abs(lastStretchedSelection.x2 - lastStretchedSelection.x1);

      // Get current point [x,y] on canvas
      const originalPoint = [zx.invert(lastStretchedSelection.x1), zy.invert(lastStretchedSelection.y1)];
      const originalEndPoint = [zx.invert(lastStretchedSelection.x2), zy.invert(lastStretchedSelection.y2)];

      // console.log(originalPoint);
      // console.log(originalEndPoint);

      this.selectReviews(originalPoint, originalEndPoint);

      // Calc scale mapping distance AxisX in width * k
      // Example: Scale 1, width: 830, totalX: 415
      // Result in a zoom of 2
      const t = d3.zoomIdentity.scale(((this.width * this.lastTransform.k) / totalX));
      // Re-scale axis for the new transformation
      zx = t.rescaleX(this.x);
      zy = t.rescaleY(this.y);

      // Call zoomFunction with a new transformation from the new scale and brush position.
      // To calculate the brush position we use the originalPoint in the new Axis Scale.
      // originalPoint it's always positive (because we're sure it's within the canvas).
      // We need to translate this originalPoint to [0,0]. So, we do (0 - position) or (position * -1)
      // this.canvasChart
      //   .transition()
      //   .duration(750)
      //   .ease(d3.easeLinear)
      //   .call(this.zoom_function.transform,
      //     d3.zoomIdentity
      //       .translate(zx(originalPoint[0]) * -1, zy(originalPoint[1]) * -1)
      //       .scale(t.k));

      this.lastStretchedSelection = null;
    } else {
      // [Xiong] moved this function call to brush_startEvent
      // this.brushSvg.call(this.brush.move, null);

      // [Xiong] revised version of selecting points in any sized selection
      // Re-scale axis for the last transformation
      let zx = this.lastTransform.rescaleX(this.x);
      let zy = this.lastTransform.rescaleY(this.y);

      const brushXY = d3.brushSelection(this.brushSvg.node());
      // console.log('brushXY', brushXY);
      if (brushXY) {
        // Get current point [x,y] on canvas
        const originalStartPoint = [zx.invert(brushXY[0][0]), zy.invert(brushXY[0][1])];
        const originalEndPoint = [zx.invert(brushXY[1][0]), zy.invert(brushXY[1][1])];
        this.lastSelection = {
          x1: brushXY[0][0],
          y1: brushXY[0][1],
          x2: brushXY[1][0],
          y2: brushXY[1][1]
        };

        console.log('start', originalStartPoint, 'end', originalEndPoint);

        // [Xiong] code for drawing a rectangle on the lastStretchedSelection points (stretched rectangle)
        // _context.rect(lastStretchedSelection.x1, lastStretchedSelection.y1, lastStretchedSelection.x2 - lastStretchedSelection.x1, lastStretchedSelection.y2 - lastStretchedSelection.y1);
        // [Xiong] code for drawing a rectangle on the exact selection (any shape)
        // _context.rect(brushXY[0][0], brushXY[0][1], brushXY[1][0] - brushXY[0][0], brushXY[1][1] - brushXY[0][1]);
        // _context.stroke();

        // [Xiong] if we zoom the scatter plot first, then try to select, we should consider the zooming transformation
        // instead of totally resetting the canvas zoom
        this.draw(this.zoomTransform);
        this.selectReviews(originalStartPoint, originalEndPoint);
      } else {
        this.draw(this.zoomTransform);
        this.selectReviews();
      }
    }
  }

  selectReviews(tl, br) {
    const reduction = this.props.reduction;
    if (tl && br) {
      const _df = new DataFrame(this.dataSamples);
      // note in this filtering canvas y-axis is different from the
      // points one
      let _selectedPoints = _df.where(_ =>
        _.get(`${reduction}_x`) > tl[0] &&
        _.get(`${reduction}_x`) < br[0] &&
        _.get(`${reduction}_y`) > br[1] &&
        _.get(`${reduction}_y`) < tl[1]
      );
      // console.log(_selectedPoints.toCollection());
      this.setState({ selectedPoints: _selectedPoints });
    } else {
      this.setState({ selectedPoints: null });
    }
  }

  fixCanvasContext() {
    // this.context = this.canvasChart.node().getContext('2d');
  }

  componentDidUpdate() {
    // console.log(this.props.reduction);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.reduction != nextProps.reduction) {
      this.reduction = nextProps.reduction;
      this.drawReviewPoints();
    }

    //Box Zoom
    // [Xiong] reference code for toggling zoom|brush buttons
    // const zoomButton = toolsList.select('#zoom').on('click', () => {
    //   toolsList.selectAll('.active').classed('active', false);
    //   zoomButton.classed('active', true);
    //   _this.canvasChart.style('z-index', 1);
    //   svgChartParent.style('z-index', 0);
    // });

    // const brushButton = toolsList.select('#brush').on('click', () => {
    //   toolsList.selectAll('.active').classed('active', false);
    //   brushButton.classed('active', true);
    //   _this.canvasChart.style('z-index', 0);
    //   svgChartParent.style('z-index', 1);
    // });
    if (this.props.brushing != nextProps.brushing) {
      const svgChartParent = d3.select('svg');
      if (this.props.brushing) {
        // brush => zoom
        this.canvasChart.style('z-index', 1);
        svgChartParent.style('z-index', 0);
      } else {
        // zoom => brush
        this.canvasChart.style('z-index', 0);
        svgChartParent.style('z-index', 1);
      }
    }
  }

  resetVis() {
    const t = d3.zoomIdentity.translate(0, 0).scale(1);
    this.canvasChart.transition()
      .duration(750)
      .ease(d3.easeLinear)
      .call(this.zoom_function.transform, t);
  }

  render() {
    return (
      <div className="vis-pane">
        <div className="plot-col">
          <div className="vis" ref={ e => this.visRef = e }></div>
          <ClusterView />
        </div>
        <DetailsPane selectedPoints={ this.state.selectedPoints } />
      </div>
    );
  }
}

export default VisPane;