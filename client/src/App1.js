/* client/src/App.js */

import React, { Component } from 'react';
import './App.css';
import logo from './logo.png';
import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();
var oldName = '';
//var nowPlaying = nowPlaying: {name: '', albumArt: ''};
class App extends Component {
  constructor(){
    super();
    const params = this.getHashParams();
    const token = params.access_token;
    if (token) {
      spotifyApi.setAccessToken(token);
    }
    this.state = {
      loggedIn: token ? true : false,
      nowPlaying: { name: 'Not Checked', albumArt: '' }
    }
  }
  getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    e = r.exec(q)
    while (e) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
       e = r.exec(q);
    }
    return hashParams;
  }

  getNowPlaying(){
    spotifyApi.getMyCurrentPlaybackState()
      .then((response) => {
        this.setState({
          nowPlaying: {
              name: response.item.name,
              albumArt: response.item.album.images[0].url
            }
        });
        //console.log(this.state.nowPlaying);
      })
      .catch(error => alert('Spotify is closed: ' + error.message));
      //var newName = this.setState.nowPlaying.name;
      //console.log(newName);
    }
    check() {
      this.getNowPlaying()
      var newName = this.getNowPlaying.name;
      if (newName != oldName) {
        console.log(oldName);
        oldName = newName;
      }
    }

  render() {
    return (
      <div className="App">
        <a href='http://localhost:8888' > Login to Spotify </a>
        <div>
          Now Playing: { this.state.nowPlaying.trackName }
        </div>
        <div>
          <img src={this.state.nowPlaying.albumArt} style={{ height: 150 }}/>
        </div>
        { this.state.loggedIn &&
          <button onClick={() => this.getNowPlaying()}>
            Check Now Playing
          </button>
        }
      </div>
    );
  }

  componentDidMount() {

  }
}


export default App;
