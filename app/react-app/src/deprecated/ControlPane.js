import React, { Component } from 'react';

class ControlPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      brushing: false
    };
    this.onSelectReductionMethod = this.onSelectReductionMethod.bind(this);
    this.onEnableZoom = this.onEnableZoom.bind(this);
    this.onEnableBrush = this.onEnableBrush.bind(this);
    this.onResetVis = this.onResetVis.bind(this);
  }

  onSelectReductionMethod(e) {
    this.props.onSelectReductionMethod(e.target.value);
  }

  onEnableZoom() {
    this.setState({ brushing: false });
    this.props.onEnableBrush(false);
  }

  onEnableBrush() {
    this.setState({ brushing: true });
    this.props.onEnableBrush(true);
  }

  onResetVis() {
    this.props.onResetVis();
  }

  render() {
    return (
      <div className="control-pane">
        <p className="placeholder-p">Control Pane</p>
        <div className="reduction-method-pane">
          <span>Reduction Method:</span>
          <select onChange={ this.onSelectReductionMethod }>
            <option value="pca">PCA</option>
            <option value="tsne">TSNE</option>
            <option value="umap">UMAP</option>
          </select>
        </div>
        <div className="vis-controls">
          <span>Select Points:</span>
          <button id="reset" onClick={ this.onResetVis }>Reset</button>
          <button id="zoom" className={ this.state.brushing ? '' : 'active' } onClick={ this.onEnableZoom }>Zoom</button>
          <button id="brush" className={ this.state.brushing ? 'active' : '' } onClick={ this.onEnableBrush }>Brush</button>

        </div>
      </div>
    );
  }
}

export default ControlPane;