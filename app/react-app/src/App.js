import React from 'react';
import './App.css';
import DashboardPane from './DashboardPane';
import EntityPane from './EntityPane';
import * as d3 from "d3";


class App extends React.Component {
  constructor(props) {

    super(props);

    this.state = {
      attributes: [],
      reduction: 'pca',
      brushing: false,
      bizId: 'all',
      cid: -1
    };

    this.onSelectReductionMethod = this.onSelectReductionMethod.bind(this);
    this.onEnableBrush = this.onEnableBrush.bind(this);
    this.onResetVis = this.onResetVis.bind(this);
    this.onLoadHotelCluster = this.onLoadHotelCluster.bind(this);
    var schema_address = process.env.REACT_APP_SERVER_ADDRESS + 'data/schema.json';
    d3.json(schema_address).then(data => 
    {
      this.setState({attributes: data.schema})
    });
  }

  onSelectPoints(points) {
    console.log(points.count());
  }

  onSelectReductionMethod(_reduction) {
    // console.log(_reduction);
    this.setState({ reduction: _reduction });
  }

  onEnableBrush(_brushing) {
    this.setState({ brushing: _brushing });
  }

  onResetVis() {
    this.visPaneRef.resetVis();
  }

  onLoadHotelCluster(hotelInfo) {
    // console.log(bizId);
    this.setState(hotelInfo);
  }

  render() {
    return (
      <div className="wrap">
        <EntityPane 
          onLoadHotelCluster={ this.onLoadHotelCluster }
          attributes={ this.state.attributes } />
        <DashboardPane
          ref={ e => this.visPaneRef = e }
          df={ this.state.df }
          attributes={ this.state.attributes }
          dataUrl={ this.state.dataUrl }
          reduction={ this.state.reduction }
          brushing={ this.state.brushing }
          bizId={ this.state.bizId }
          hotelName={ this.state.hotelName }
          rcount={ this.state.rcount } />
      </div>
    );
  }
}

export default App;
