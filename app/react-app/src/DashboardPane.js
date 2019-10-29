import React, { Component } from 'react';
import ClusterView from './ClusterView';
import DetailsPane from './DetailsPane';

class DashboardPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPoints: null,
      cid: -1,
      cid2: -1,
      clusterTopwords: []
    };
    this.onSelectCluster = this.onSelectCluster.bind(this);
    this.onSetClusterTopwords = this.onSetClusterTopwords.bind(this);
  }

  onSelectCluster(cid, cid2) {
    if (cid2) {
      this.setState({ cid: cid, cid2: cid2 });
    } else {
      this.setState({ cid: cid });
    }
  }

  onSetClusterTopwords(words) {
    this.setState({ clusterTopwords: words });
  }

  render() {
    return (
      <div className="vis-pane">
        <ClusterView
          attributes={this.props.attributes}
          onSelectCluster={this.onSelectCluster}
          bizId={ this.props.bizId }
          hotelName={ this.props.hotelName }
          rcount={ this.props.rcount }
          onSetClusterTopwords={ this.onSetClusterTopwords } />
        <DetailsPane
          attributes={ this.props.attributes }
          selectedPoints={ this.state.selectedPoints }
          bizId={ this.props.bizId }
          cid={ this.state.cid }
          cid2={ this.state.cid2 }
          clusterTopwords={ this.state.clusterTopwords }/>
      </div>
    );
  }
}

export default DashboardPane;
