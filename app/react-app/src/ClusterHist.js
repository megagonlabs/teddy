import React, { Component } from 'react';
import vegaEmbed from 'vega-embed';

const vgEmbedOptions = { actions: false, renderer: 'svg', tooltip: false };

class ClusterHist extends Component {

  componentDidMount() {
    // histograms for attributes
    let values = [];
    this.props.hist.forEach((y, j) => {
      values.push({ 'x': this.props.div[j], 'y': y });
    });

    let spec = {
      "data": {
        "values": values
      },
      "height": 50,
      "width": this.props.width,
      "mark": "bar",
      "encoding": {
        "x": {"field": "x", "type": "ordinal", "title": ""},
        "y": {"field": "y", "type": "quantitative", "title": ""}
      },
      "config": {
        "axis": false,
        "labels": false
      }
    };

    vegaEmbed(this.visRef, spec, vgEmbedOptions);
  }

  render() {
    return (
      <div className="vgl-vis" ref={e => this.visRef = e}></div>
    );
  }
}

export default ClusterHist;