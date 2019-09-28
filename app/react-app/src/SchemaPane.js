import React, { Component } from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';

class SchemaPane extends Component {
  constructor(props) {
    super(props);
    this.state={
      newAttributes: []
    };

    this.selectAttr = this.selectAttr.bind(this);
    this.removeAttr = this.removeAttr.bind(this);
    this.addAttr = this.addAttr.bind(this);
    this.moveAttr = this.moveAttr.bind(this);
    this.takeSuggestion = this.takeSuggestion.bind(this);
    this.exportSchema = this.exportSchema.bind(this);

    window._exportSchema = () => {
      this.exportSchema();
    };
  }

  exportSchema() {
    const schemaText = this.state.newAttributes.map(x => x.text).reduce((a, b) => (a + '\n' + b));
    this.downloadRef.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(schemaText));
    this.downloadRef.setAttribute('download', 'schema.txt');
    this.downloadRef.click();
  }

  componentDidMount() {

  }

  selectAttr(e) {
    const attri = e.target.getAttribute('attri');
    let attributes = this.props.attributes;
    attributes[attri].active = !attributes[attri].active;
    this.setState({ attributes: attributes });
  }

  removeAttr(e) {
    e.stopPropagation();
    const attri = e.target.getAttribute('attri');
    let newAttributes = this.state.newAttributes;
    newAttributes.splice(attri, 1)
    this.setState({ newAttributes: newAttributes });
  }

  addAttr(e) {
    e.preventDefault();
    // console.log(this.inputRef.value);
    const newAttr = { text: this.inputRef.value, active: false };
    this.setState({ newAttributes: [...this.state.newAttributes, newAttr] });
    this.inputRef.value = '';
  }

  moveAttr(e) {
    const attri = e.target.getAttribute('attri');
    this.setState({ newAttributes: [...this.state.newAttributes, this.props.attributes[attri]] });
  }

  takeSuggestion(e) {
    const attr = e.target.getAttribute('attr');
    this.setState({ newAttributes: [...this.state.newAttributes, { text: attr, active: false }] });
  }

  render() {
    const attributes = this.props.attributes;
    const newAttributes = this.state.newAttributes;

    return (
      <div className="schema-pane-wrap">
        <div className="existing-schema">
          <h4>Existing Schema</h4>
          <ListGroup>
            { attributes.map((attr, i) => <ListGroup.Item attri={i} key={i} active={attr.active}>{attr.text} <span className="remove-attr" attri={i} onClick={this.moveAttr}>&#x2b;</span></ListGroup.Item>) }
          </ListGroup>
        </div>
        <div className="working-schema">
          <h4>New Schema <span className="download-schema" onClick={ this.exportSchema }>&#x1f4be;</span></h4>
          <div className="schema-suggestions">
            <span>Suggestions:</span>
            {
              this.props.clusterTopwords.map((w, i) => <span className="schema-suggestion-item" key={i} onClick={this.takeSuggestion} attr={w}>{w}</span>)
            }
          </div>
          <ListGroup>
            { newAttributes.map((attr, i) => <ListGroup.Item attri={i} key={i} active={attr.active}>{attr.text} <span className="remove-attr" attri={i} onClick={this.removeAttr}>&#10007;</span></ListGroup.Item>) }
            <ListGroup.Item>
              <Form onSubmit={this.addAttr}>
                <Form.Control className="attr-input" type="text" ref={ e => this.inputRef = e } placeholder="Type your own ..."></Form.Control>
              </Form>
            </ListGroup.Item>
          </ListGroup>
        </div>
        <a ref={ e => this.downloadRef = e }></a>
      </div>
    );
  }
}

export default SchemaPane;