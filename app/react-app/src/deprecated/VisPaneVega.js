import React, { Component } from 'react';
import vegaEmbed from 'vega-embed';
import dfjs from 'dataframe-js';

class VisPaneVega extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPoints: null
    };
  }

  updateDimensions() {
    // console.log(this.visRef.clientWidth);
    // console.log(this.visRef.clientHeight);
  }

  drawReviewPoints(reduction) {
    let schema = {
      "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
      "data": { "url": this.props.dataUrl },
      "mark": "point",
      "autoresize": {
        "type": "fit"
      },
      "width": this.visRef.clientWidth - 100,
      "height": this.visRef.clientHeight - 100,
      "selection": {
        "brush": {
          "type": "interval"
        }
        // "grid": {
        //   "type": "interval",
        //   "bind": "scales"
        // }
      },
      "encoding": {
        "x": { "field": `${reduction}_x`, "type": "quantitative", "title": "" },
        "y": { "field": `${reduction}_y`, "type": "quantitative", "title": "", "axis": { "orient": "right" } },
        "color": {
          "condition": { "selection": "brush" },
          "value": "grey"
        }
      }
    };

    let view = vegaEmbed('.vis', schema, { actions: false });

    view.then(v => {
      window._view = v.view; // debugging hook

      v.view.addDataListener('brush_store', (name, value) => {
        // console.log(name, value[0].values);
        if (value) {
          let [xs, ys] = value[0].values;
          let _selectedPoints = this.props.df.where(_ =>
            _.get(`${reduction}_x`) > xs[0] &&
            _.get(`${reduction}_x`) < xs[1] &&
            _.get(`${reduction}_y`) > ys[1] &&
            _.get(`${reduction}_y`) < ys[0]
          );
          // console.log(_selectedPoints.toCollection());
          this.setState({ selectedPoints: _selectedPoints });
        }
      });
    });
  }

  componentDidMount() {
    // console.log(this.visRef.clientWidth);
    // console.log(this.visRef.clientHeight);

    window.addEventListener("resize", this.updateDimensions.bind(this));

    this.drawReviewPoints(this.props.reduction);
  }

  componentDidUpdate() {
    console.log(this.props.reduction);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.reduction != nextProps.reduction) {
      this.drawReviewPoints(nextProps.reduction);
    }
  }

  render() {
    return (
      <div className="vis-pane">
        <div className="vis" ref={e => this.visRef = e}></div>
        <div className="review-data"> {
            this.state.selectedPoints && this.state.selectedPoints.toCollection().map(row => {
              return (<p key={ row['index'] }>{ row['text'] }</p>)
            })
          }
        </div>
      </div>
    );
  }
}

export default VisPaneVega;