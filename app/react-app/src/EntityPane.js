import React, { Component } from 'react';
import * as d3 from "d3";
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import Dropdown from 'react-bootstrap/Dropdown';
import Nav from 'react-bootstrap/Nav';
import { AnimateOnChange } from 'react-animation';
import packageJson from '../package.json';

class EntityPane extends Component {
  constructor(props) {
    super(props);
    var attr = props.attributes
    this.state = {
      attributes: attr,
      cardTitle: '',
      cardText: '',
      cardRCount: 0,
      cardPhotoUrl: 'teddy.jpg',
      cardBizId: '',
      colorAttribute: 'mean_score',
      hotelsList: [],
      selectedSectioni: -1,
      selectedHoteli: -1,
      entityView: 'treemap'
    };

    this.lastSelectedHotel = null;

    this.closeCard = this.closeCard.bind(this);
    this.loadHotelCluster = this.loadHotelCluster.bind(this);
    this.colorHotel = this.colorHotel.bind(this);
    this.switchEntityView = this.switchEntityView.bind(this);
    this.selectEntity = this.selectEntity.bind(this);
  }

  componentDidMount() {
    this.loadGoogleMaps();

    let _this = this;
    var hotel_sections_json = process.env.REACT_APP_SERVER_ADDRESS + 'data/hotel-sections.json';
    d3.json(hotel_sections_json).then(data => {
      _this.setState({ hotelsList: data.children });
    });

    d3.json(hotel_sections_json).then(data => {
      data.children.forEach((d, i) => {
        d3.select('.entities').append('h4').text(`Section ${i}`);
        this.addTreemap(d);
      });
    });

    window.colorEntities = (attr) => {
      this.setState({ colorAttribute: attr });
      this.reColorHotels(attr);
    };
  }

  loadGoogleMaps = () => {
    const existingScript = document.getElementById('googleMaps');
    if (!existingScript) {
      const script = document.createElement('script');
      const ggApiKey = process.env.REACT_APP_GOOGLE_API_KEY;
      if (ggApiKey === '') {
        console.error('[Teddy Bark] Google API Key is EMPTY!');
      }
      script.src = `https://maps.googleapis.com/maps/api/js?key=${ggApiKey}&libraries=places`;
      script.id = 'googleMaps';
      document.body.appendChild(script);

      script.onload = () => {
        this.map = new window.google.maps.Map(this.mapRef, {
          center: {lat: 37.390899, lng: -122.081629},
          zoom: 15
        });
        window.map = this.map;
        this.service = new window.google.maps.places.PlacesService(this.map);
      };
    }
  };

  

  addTreemap(data) {
    const width = 600;
    const height = 3000 * data.children.length / 390;

    let treemap = _data => d3.treemap()
      .tile(d3['treemapBinary'])
      .size([width, height])
      .paddingRight(0)
      .paddingTop(2)
      .paddingBottom(2)
      .paddingInner(2)
      .round(true)
      (d3.hierarchy(_data)
        .sum(d => Math.log2(d.rcount) < 5 ? 5 : Math.log2(d.rcount))
        .sort((a, b) => b.rcount - a.rcount));

    let root = treemap(data);

    const container = d3.select('.entities');
    this.svg = container.append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("font", "12px sans-serif");

    const leaf = this.svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // leaf.append("title")
    //   .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${format(d.value)}`);
    leaf.append("title")
      .text(d => { return d.data.name; });

    leaf.append("rect")
      .attr("id", d => (d.leafUid = 'leaf-1'))
      .attr("class", "hotel-block")
      // .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("fill", d => { return d3.interpolateRdBu(parseFloat(d.data.mean_score) / 100); })
      .attr("fill-opacity", 0.8)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);

    leaf.append("clipPath")
      .attr("id", d => (d.clipUid = 'clip-1'))
      .append("use")
      .attr("xlink:href", d => d.leafUid.href);

    leaf.append("text")
      .attr("clip-path", d => d.clipUid)
      .selectAll("tspan")
      .data(d => [d.data.rcount, ''])
      .join("tspan")
      .attr("x", 3)
      .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
      .text(d => { return d; });

    const _this = this;
    this.svg.selectAll('rect')
      .on('mouseover', function (d) {
        d3.select(this).style('fill', '#ffbf6b')
      })
      .on('mouseout', function (d) {
        /* while (d.depth > 1) d = d.parent; */
        return d3.select(this).style('fill', d3.interpolateRdBu(parseFloat(d.data.mean_score) / 100))
      })
      .on('click', function (d, e) {
        const rectPos = d3.select(this).node().getBoundingClientRect();

        if (_this.lastSelectedHotel) {
          d3.select(_this.lastSelectedHotel).style('stroke-width', '0');
        }
        d3.select(this).style('stroke', '#ffbf6b').style('stroke-width', '3');
        _this.lastSelectedHotel = this;
        _this.loadEntityCard(rectPos, d.data);
      });
  }

  loadEntityCard(rectPos, data) {
    this.cardRef.style.left = rectPos.x + rectPos.width / 2 + 'px';
    var height = rectPos.y + rectPos.height / 2;
    while ((height + 350) > window.innerHeight){
      height -= 50;
      if (height < 0) {
        break;
      }
    }
    this.cardRef.style.top = height + 'px';
    this.cardRef.style.visibility = 'visible';
    this.cardRef.style.zIndex = '10';
    this.cardRef.style.opacity = 1;

    this.setState({
      cardTitle: data.hotel_name,
      cardText: data.hotel_street,
      cardRCount: data.rcount,
      cardPhotoUrl: 'teddy-loading.jpg',
      cardBizId: data.business_id
    });

    const request = { placeId: data.place_id, fields: ['photo'] };
    this.service.getDetails(request, (place, status) => {
      const OK = window.google.maps.places.PlacesServiceStatus.OK;
      if ((status == OK) && (place.photos)) {
        this.setState({ cardPhotoUrl: place.photos[0].getUrl() });
      } else {
        this.setState({ cardPhotoUrl: 'teddy-na.jpg' });
      }
    });

    if (this.marker) {
      this.marker.setMap(null);
    }

    const pos = { lat: parseFloat(data.lat), lng: parseFloat(data.lng) };
    this.marker = new window.google.maps.Marker({
      position: pos,
      map: this.map
    });

    this.map.setCenter(pos);
  }

  pickColor(data, attr) {
    if (attr == 'mean_score') {
      return d3.interpolateRdBu(parseFloat(data.mean_score) / 100);
    } else {
      return d3.interpolateRdBu((data[attr] + 1) / 2);
    }
  }

  reColorHotels(attr) {
    const _this = this;
    d3.selectAll('rect')
    .style('fill', d => this.pickColor(d.data, attr))
    .on('mouseout', function(d) {
      d3.select(this).style('fill', _this.pickColor(d.data, attr))
    });
  };

  closeCard() {
    this.cardRef.style.opacity = 0;
    this.cardRef.style.visibility = 'hidden';
    this.cardRef.style.zIndex = '-1';
    d3.select(this.lastSelectedHotel).style('stroke-width', '0');
    this.setState({ selectedSectioni: -1, selectedHoteli: -1 });
  }

  loadHotelCluster() {
    this.closeCard();

    this.props.onLoadHotelCluster({
      bizId: this.state.cardBizId,
      hotelName: this.state.cardTitle,
      rcount: this.state.cardRCount
    });
  }

  colorHotel(e) {
    e.preventDefault();
    const attr = e.target.href.substring(window.location.origin.length + 1);
    this.setState({ colorAttribute: attr });
    this.reColorHotels(attr);
  }

  switchEntityView(selectedKey, e) {
    e.preventDefault();
    this.setState({ entityView: selectedKey });
  }

  selectEntity(e) {
    const sectioni = e.target.getAttribute('sectioni');
    const hoteli = e.target.getAttribute('hoteli');
    this.setState({ selectedSectioni: sectioni, selectedHoteli: hoteli });
    this.loadEntityCard(e.target.getBoundingClientRect(), this.state.hotelsList[sectioni]['children'][hoteli]);
  }

  render() {
    const cardTitle = this.state.cardTitle;
    const cardText = this.state.cardText;
    const rcount = this.state.cardRCount;
    const cardPhotoUrl = this.state.cardPhotoUrl;
    const hotelsList = this.state.hotelsList;
    const attributes = this.state.attributes;

    return (
      <div className="entity-pane">
        <div className="pane-header">
            <div>
              <h4>Entity</h4>
            </div>
            <Dropdown>
              <Dropdown.Toggle variant="light" id="dropdown-basic" className="entity-color-selection" size="sm">
                {this.state.colorAttribute}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item href="mean_score" className="entity-color-selection-item" onClick={this.colorHotel}>mean_score</Dropdown.Item>

                {
                  this.state.attributes.map((attr, i) => (
                    <Dropdown.Item href={`${attr}`} className="entity-color-selection-item" onClick={this.colorHotel} key={i}>{attr}</Dropdown.Item>
                  ))
                }
              </Dropdown.Menu>
            </Dropdown>
        </div>
        <Nav fill variant="tabs" defaultActiveKey="treemap" onSelect={this.switchEntityView}>
          <Nav.Item><Nav.Link href="treemap">Treemap</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link href="list">List</Nav.Link></Nav.Item>
        </Nav>
        <div className="entities-list" style={{ display: this.state.entityView == 'treemap' ? 'none' : 'block' }}>
          {
            hotelsList.map((section, i) => {
              return (
                <div key={i}>
                  <h4>Section {i}</h4>
                  <ListGroup variant="flush">
                    {
                      section.children.map((hotel, j) => {
                        let color = d3.color(this.pickColor(hotel, this.state.colorAttribute));
                        color.opacity = 0.5;
                        const style = {
                          backgroundColor: ((i == this.state.selectedSectioni) && (j == this.state.selectedHoteli))
                            ? '#ffbf6b' : color
                        };
                        return (<ListGroup.Item className="entity-list-item" style={style} key={j} onClick={this.selectEntity} sectioni={i} hoteli={j}>{ hotel.hotel_name }</ListGroup.Item>)
                      })
                    }
                  </ListGroup>
                </div>
              );
            })
          }
        </div>
        <div className="entities" style={{ display: this.state.entityView == 'treemap' ? 'block' : 'none' }}></div>
        <Card className="hotel-card" style={{ width: '20rem' }} ref={ e => this.cardRef = e }>
          <AnimateOnChange animationIn="fadeIn" animationOut="fadeOut">
            <Card.Img className="hotel-photo" variant="top" style={{width:320,height:150}} src={cardPhotoUrl} />
          </AnimateOnChange>
          <Card.Body>
            <Card.Title>{cardTitle}</Card.Title>
            <Card.Text>Address: {cardText}</Card.Text>
            <ListGroup className="list-group-flush hotel-card-details">
              <ListGroupItem>{rcount} reviews</ListGroupItem>
            </ListGroup>
            <Button className="card-btn" variant="primary" onClick={this.loadHotelCluster} size="sm">Load Cluster</Button>
            <Button className="card-btn" variant="danger" onClick={this.closeCard} size="sm">Close</Button>
          </Card.Body>
        </Card>
        <div className="hotel-map" ref={ e => this.mapRef = e } >
      </div>
    </div>
    );
  }
}

export default EntityPane;
