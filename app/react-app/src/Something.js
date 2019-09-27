import React, { Component } from 'react';

class Something extends Component {
  constructor(props) {
    super(props);
    this.state = {
      summary: ''
    };
  }

  render() {
    return (
      <div className="review-summary">
        <h2>{(this.state.summary === '' ? 'Cluster Text Summary' : this.state.summary)}</h2>
      </div>
    );
  }
}

export default Something;