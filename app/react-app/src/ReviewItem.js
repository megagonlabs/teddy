import React, { Component } from 'react';
import * as d3 from "d3";
import vegaEmbed from 'vega-embed';
import Badge from 'react-bootstrap/Badge';
import Table from 'react-bootstrap/Table';
import reactStringReplace from 'react-string-replace';

const vgEmbedOptions = { actions: false, renderer: 'svg', tooltip: false };

class ReviewItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showVis: false
    };
    this.visHeight = 0;
    this.topwords = Object.keys(JSON.parse(this.props.row.topwords));
    this.topwords.sort((a, b) => (this.props.row.topwords[a] - this.props.row.topwords[b]));
    this.toggleVis = this.toggleVis.bind(this);

    window.bla = () => {

    };
  }

  componentDidMount() {
    const row = this.props.row;
    let extractedAttributes = this.props.attributes.filter(k => row[k] != 0);
    if (extractedAttributes.length != 0) {
      let values = extractedAttributes.map(k => {
        return {
          attribute: k,
          score: row[k],
          color: row[k] > 0 ? '#4c78a8': '#96312e'
        }
      });
      let spec = {
        "data": { "values": values },
        "mark": "bar",
        // "width": this.visRef.clientHeight * 0.7,
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
            "scale": { "domain": [-1, 1] },
            // "axis": { "title": "score" },
            "title": ""
          },
          "color": {
            "field": "color",
            "type": "nominal",
            "scale": null
          }
        },
        "config": {
          "bar" : {
            "discreteBandSize": 10
          },
          "axisX": {
            "tickCount": 10
          }
        }
      };

      vegaEmbed(this.visRef, spec, vgEmbedOptions);
    }
  }

  toggleVis() {
    // console.log(this.props.row);
    var selection = window.getSelection();
    if (!selection.toString()) {
      this.setState({ showVis: !this.state.showVis });
    }  
  }

  render() {
    const row = this.props.row;
    let scoreColor = d3.interpolateRdBu((parseFloat(row[this.props.colorAttr]) + 1) / 2);
    let backgroundColor = d3.color(scoreColor);
    backgroundColor.opacity = 0.2;
    const style = {
      borderColor: scoreColor,
      backgroundColor: backgroundColor
    };

    const extractedAttributes = this.props.attributes.filter(k => row[k] != 0);
    // const pclass = extractedAttributes.length == 0 ? 'p-noextraction' : 'p-extraction';

    const showVis = this.state.showVis;
    const visStyle = {
      visibility: showVis ? 'visible' : 'hidden',
      position: showVis ? 'static' : 'absolute',
      opacity: showVis ? 1 : 0
    };

    let shortText = row.text.length > 100 ? row.text.substring(0, 100) + ' ...' : row.text;
    const pattern = this.props.pattern;
    shortText = reactStringReplace(shortText, pattern, (x, i) => <span className="grep-hl" key={i}>{x}</span>);
    const longText = reactStringReplace(row.text, pattern, (x, i) => <span className="grep-hl" key={i}>{x}</span>);

    // [Xiong] change the '' key to 'index' from backend pipeline
    return (
      <div className="review-item-wrap">
        <div className="review-item-text p-extraction" style={style}>
          <p onClick={this.toggleVis}>
            { showVis ? longText : shortText }
          </p>
          <div className="review-item-tags">
            { extractedAttributes.map((k, i) => <Badge pill variant={row[k] > 0 ? 'primary' : 'danger'} className="review-tag" key={i}>{k}</Badge>) }
          </div>
        </div>
        <div className="review-item-details" style={visStyle}>
          <Table striped bordered size="sm" responsive="sm" >
            <tbody>
              <tr>
                <td>Char Length</td>
                <td> { parseInt(this.props.row.charLength) } </td>
              </tr>
              <tr>
                <td>Word Length</td>
                <td> { parseInt(this.props.row.wordLength) } </td>
              </tr>
              <tr>
                <td>Sent Length</td>
                <td> { parseInt(this.props.row.sentLength) } </td>
              </tr>
              <tr>
                <td>Top Words</td>
                <td>{ this.topwords.join(', ') }</td>
              </tr>
              <tr>
                <td>Attributes</td>
                <td><div className='review-item-vis' ref={ e => this.visRef = e }></div></td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
    );
  }
}

export default ReviewItem;
