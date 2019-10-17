import React, { Component } from 'react';
import * as d3 from "d3";
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Spinner from 'react-bootstrap/Spinner';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ReviewItem from './ReviewItem';
import SchemaPane from './SchemaPane';
import brace from 'brace';
import "brace/ext/language_tools";
import AceEditor from 'react-ace';

import 'brace/mode/javascript';
import 'brace/theme/chrome';

import * as esprima from 'esprima';

var attributes = [];
class DetailsPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attributes: props.attributes,
      reviews: [],
      editorValue: '',
      history: [],
      colorAttr: 'weighted_mean_sentiment',
      pattern: '',
    };
    this.starti = 0;
    this.reviews = [];
    // attributes = this.props.attributes;

    this.onClickLoadMore = this.onClickLoadMore.bind(this);
    this.runCell = this.runCell.bind(this);
    this.remoteRun = this.remoteRun.bind(this);
  }

  componentDidMount() {
    // defining CLI APIs
    window.tSort = (attr, asc = true) => {
      console.log(`sorting reviews based on ${attr}`);
      let reviews = [...this.state.reviews];
      reviews.sort((a, b) => { return asc ? (a[attr] - b[attr]) : (b[attr] - a[attr]) });
      this.setState({ reviews: reviews });
    };

    window.tFilter = (attr, predicate) => {
      console.log(`filtering reviews based on ${attr}`);
      const reviews = [...this.state.reviews];
      if (predicate) {
        this.setState({ reviews: reviews.filter(r => predicate(r[attr])) });
      } else {
        this.setState({ reviews: reviews.filter(r => r[attr] != 0) });
      }
    };

    window.tGrep = (pattern) => {
      // search for reviews with a certain pattern
      const reviews = [...this.state.reviews];
      this.setState({
        reviews: reviews.filter(r => r.text.search(pattern) != -1),
        pattern: pattern
      });
    };

    window.tColor = (attr) => {
      this.setState({ colorAttr: attr });
    };

    window.tReset = () => {
      this.setState({
        colorAttr: 'weighted_mean_sentiment',
        reviews: this.reviews,
        pattern: ''
      });
    };
  }

  loadClusterReview(bizId, cid, cid2) {
    console.log(`loading reviews for ${bizId}:${cid}-${cid2}`);
    var cluster_reviews_url = process.env.REACT_APP_SERVER_ADDRESS + 'cluster-reviews/';
    let url = new URL(cluster_reviews_url);
    url.searchParams.append('biz_id', bizId);
    url.searchParams.append('cid', cid);
    url.searchParams.append('cid2', cid2);
    url.searchParams.append('starti', this.starti);
    let _this = this;
    d3.csv(url).then((newReviews) => {
      _this.reviews = [..._this.reviews, ...newReviews];
      _this.setState({ reviews: _this.reviews });
      _this.starti += 10;
    });
  }

  loadClusterSummary(cid) {
    var cluster_reviews_summary = process.env.REACT_APP_SERVER_ADDRESS + 'cluster-reviews-summary/';
    let url = new URL(cluster_reviews_summary);
    url.searchParams.append('cid', cid);
    let _this = this;
    d3.json(url).then((res) => {
      console.log(res);
      _this.setState({ summary: res['summary'] });
    });
  }

  componentWillReceiveProps(nextProps) {
    if ((this.props.cid != nextProps.cid)
    || (this.props.cid2 != nextProps.cid2)
    || (this.props.bizId != nextProps.bizId)) {
      this.starti = 0;
      this.reviews = [];
      this.setState({
        reviews: [],
        summary: '',
        history: [],
        colorAttr: 'weighted_mean_sentiment',
        pattern: ''
      });
      if (((this.props.cid != nextProps.cid) || (this.props.cid2 != nextProps.cid2)) &&
      (nextProps.cid !== -1)) {
        // this.loadClusterSummary(nextProps.cid);
        this.loadClusterReview(nextProps.bizId, nextProps.cid, nextProps.cid2);
      }
    }
  }

  onClickLoadMore() {
    this.loadClusterReview(this.props.bizId, this.props.cid, this.props.cid2);
  }

  onAceLoad(_editor) {
    _editor.renderer.setShowGutter(false);
    _editor.setShowPrintMargin(false);
    _editor.container.style.lineHeight = '30px';
    _editor.setFontSize('1rem');
    _editor.setOptions({
      minLines: 1,
      maxLines: 5,
      autoScrollEditorIntoView: true,
      cursorStyle: 'wide',
      enableLiveAutocompletion: true
    });

    var completer = {
      getCompletions: function(editor, session, pos, prefix, callback) {
        if (prefix.length === 0) {
          callback(null, []);
          return;
        }

        // a reference
        // callback(null, wordList.map(function(ea) {
        //   return {name: ea.word, value: ea.word, score: ea.score, meta: "rhyme"}
        // }));

        let suggestionList = [
          { name: 'tSort', caption: 'tSort', value: 'tSort()', meta: 'teddy-utils' },
          { name: 'tFilter', caption: 'tFilter', value: 'tFilter()', meta: 'teddy-utils' },
          { name: 'tGrep', caption: 'tGrep', value: 'tGrep()', meta: 'teddy-utils' },
          { name: 'tColor', caption: 'tColor', value: 'tColor()', meta: 'teddy-utils' },
          { name: 'tReset', caption: 'tReset', value: 'tReset()', meta: 'teddy-utils' }
        ];

        attributes.forEach((attr) => {
          suggestionList.push({ name: attr, value: attr, meta: 'attributes' });
        });

        callback(null, suggestionList);
      }
    };
    _editor.completers = [completer];
  }

  runCell(_editor) {
    const command = _editor.getValue();
    this.setState({ editorValue: '' });
    if (!command.startsWith(':')) {
      try {
        eval(command);
      } catch(e) {
        console.error(e);
      }
      this.setState({ history: [...this.state.history, { command: command, status: 'torun' }] });
    } else {
        // magic command?
    }
  }

  remoteRun(e) {
    e.preventDefault();
    const localFuncs = ['tColor', 'colorTreemap', 'colorEntityList'];
    const commandi = e.target.getAttribute('commandi');
    let history = [...this.state.history];
    history[history.length - 1 - commandi].status = 'running';
    const command = history[history.length - 1 - commandi].command;
    this.setState({ history: history });
    const ast = esprima.parse(command).body[0];
    if (ast.type == 'ExpressionStatement') {
      const args = ast.expression.arguments.map(x => x.value);
      const func = ast.expression.callee.name;
      console.log(func, args);
      if (!(localFuncs.includes(func))) {
        var remote_run_url = process.env.REACT_APP_SERVER_ADDRESS + 'remote-run/';
        let url = new URL(remote_run_url);
        const code = { func: func, args: args };
        url.searchParams.append('biz_id', this.props.bizId);
        url.searchParams.append('cid', this.props.cid);
        url.searchParams.append('cid2', this.props.cid2);
        url.searchParams.append('code', JSON.stringify(code));
        this.starti = 0;
        url.searchParams.append('starti', this.starti);
        const _this = this;
        d3.csv(url).then((newReviews) => {
          console.log(newReviews);
          _this.reviews = newReviews;
          history[history.length - 1 - commandi].status = 'done';
          _this.setState({ history: history, reviews: _this.reviews });
          _this.starti += 10;
        });
      } else {
        try {
          eval(command);
        } catch(e) {
          console.error(e);
        }
        history[history.length - 1 - commandi].status = 'done';
        this.setState({ history: history });
      }
    }
  }

  render() {
    const historyReversed = [...this.state.history].reverse();
    return (
      <div className="details-wrap">
        <div className="text-col">
          <div className="console">
            <AceEditor
              mode="javascript"
              theme="chrome"
              name="input-editor"
              className="ace-cli"
              editorProps={{ $blockScrolling: Infinity }}
              width="100%"
              min-height="30px"
              value={this.state.editorValue}
              commands={[
                { name: 'run',
                  bindKey: { mac: 'Ctrl-Enter' },
                  exec: this.runCell },
                { name: 'up',
                  bindKey: 'Alt-Up',
                  exec: this.upHistory },
                { name: 'down',
                  bindKey: 'Alt-Down',
                  exec: this.downHistory },
                { name: 'clear',
                  bindKey: 'Ctrl-l',
                  exec: this.props.onClear },
              ]}
              onLoad={this.onAceLoad}
            />
            <div className="command-history">
              <ListGroup variant="flush">
              {
                historyReversed.map((x, i) =>
                  <ListGroup.Item key={i}>
                    <span className="command-code">{x.command}</span>
                    <span className="fetch-button" onClick={this.remoteRun}>
                      { x.status == 'running' && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> }
                      { x.status == 'torun' && <span commandi={i}>&#9654;</span> }
                      { x.status == 'done' && <span commandi={i}>&#x21bb;</span> }
                    </span>
                  </ListGroup.Item>
                )
              }
              </ListGroup>
            </div>
          </div>
          <div className="review-items">
            { (this.state.reviews.length != 0) && [
              <div key="review-text" className="review-text">
                <TransitionGroup className="review-text-transition-group"> {
                    this.state.reviews.map(row => {
                    return (
                      <CSSTransition key={row['']} timeout={500} className="review-text-transition">
                        <ReviewItem row={row} colorAttr={this.state.colorAttr} pattern={this.state.pattern} attributes={this.props.attributes}></ReviewItem>
                      </CSSTransition>
                    );
                  })
                }
                </TransitionGroup>
              </div>,
              (this.reviews.length >= 10) && <div key="load-more" className="load-more-wrap">
                <Button variant="secondary" onClick={ this.onClickLoadMore }>Load More</Button>
              </div>
            ]}
          </div>
        </div>
        <div className="schema-col">
          <SchemaPane 
            clusterTopwords={ this.props.clusterTopwords } 
            attributes={this.state.attributes.map(attr => { return { text: attr, active: false } })}/>
        </div>
      </div>
    );
  }
}

export default DetailsPane;
