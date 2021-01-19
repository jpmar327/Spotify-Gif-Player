/* client/src/App.js */

import React, { Component } from 'react';
import './App.css';
import * as SpotifyWebApi from 'spotify-web-api-js';
import './gifList.json'

// import SpotifyWebApi from 'spotify-web-api-js';
import im from './butters.gif'

const spotifyApi = new SpotifyWebApi();
// const gifList = {
//   "rock": ["https://media.giphy.com/media/PFT49iGCp0FBm/giphy.gif", "https://media.giphy.com/media/3ohhwDBA9ieFU9ATqE/giphy.gif"],
//   "hip hop": ["https://media.giphy.com/media/wAxlCmeX1ri1y/giphy.gif"],
//   "rap": ["https://media.giphy.com/media/wAxlCmeX1ri1y/giphy.gif"],
//   "edm": []
// };

var genreMax, genreMaxNum;
//spotifyApi.setAccessTokenn('BQCLl07DUYcof2ggwXDPOmKylPua9LLQVjlDvWwaVditqYiFGbG-ZmkEv4SkYGqbQvsSkNQk51sAQu92Psd2ZiZAqXb0vT7nLlE75c1bdUjrIFjYucr9IggxfnDHYPDau4V76IbjSUuLCyyKrymjjH_WC5DvXyD-VA&refresh_token=AQCYsSyzA9UY_8CrL-nWYQQBXSW7NUcuTFGOXN4vBMuopJ8A4jhoaQh_6jMPDI2ya2VXrmAYhbv3b7T2yJm56_nHFM0kOLStmcnODUP-fyfgWCHsBC7YPdPES6aV-OhZtPog6w');
// spotifyApi.setPromiseImplementation();

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
      nowPlaying: { trackName: '', previous: 'None', albumArt: '', artists_id:''},
      genreArray: '',
      genreMax:'',
      genreGif:''
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


// Calls Spotify API to get the track info
// Promises are asynchronous (kinda like multithreading)
  getNowPlaying(){
    spotifyApi.getMyCurrentPlaybackState()
      .then((data) => {
        this.setState({
          nowPlaying: {
              trackName: data.item.name,
              previous: this.state.nowPlaying.previous,
              albumArt: data.item.album.images[0].url,
              artists_id: data.item.artists[0].id
            }
        });
      })
      .catch(error => console.log('Spotify is closed: ' + error.message));
    }

// Calls Spotify API to get artists genre
getArtistInfo(info){
  spotifyApi.getArtist(''+info)
  .then((response) => {
    this.setState({
      genreArray: response.genres}
    );
  })
    .catch(error => console.log('Spotify is closed: ' + error.message));
  }

  /*Make object for counting genres genreFinder(input)
    - loop through genresList use forEach()
    - use .include()
    - make key the genreArray[i]
    - add to that key value
    - at end of loop reset the object
    - returns i.e. frequency = {rap: 3, edm: 5, country:0,..., jazz:0}
    - if found once => frequency[input] ++;
    */
  genreFinder(genreArray) {
    const genreList = ["rap", "hip hop", "rock", "alternative", "country", "trap", "metal", "jazz", "r&b", "pop", "funk", "edm", "soul"];
    var genreFrequency = {"rap":0, "hip hop":0, "rock":0, "alternative":0, "country":0, "trap":0, "metal":0, "jazz":0, "r&b":0, "pop":0, "funk":0, "edm":0, "soul":0};
    var genreInstance;
    if (genreArray.length === 0) {
        var gif = false;
    }

    else {
      var genreMaxNum = 0;
        genreList.forEach(genre => {
            for (var i = 0; i < genreArray.length; i++) {

                if (genreArray[i].includes(genre)) {
                    genreFrequency[genre] ++;
                }
            }

                if (genreFrequency[genre] >= genreMaxNum) {
                    genreMaxNum = genreFrequency[genre];
                    genreInstance = genre;
                }
        })
    }
    this.setState({genreMax: genreInstance});
  }

  getGifLink(genreIndex) {
    var min = 0;
    const gifList = {
      "rock": ["https://media.giphy.com/media/YlitvKufE2O4M/giphy.gif","https://media.giphy.com/media/3o6ZtjUZAD5Lf0QFLW/giphy.gif","https://media.giphy.com/media/xUOxeUPybwZ74eqhos/giphy.gif","https://media.giphy.com/media/3o6fIRJgi7IfPS8ZHy/giphy.gif","https://media.giphy.com/media/3o85xx69HG11jP4QIo/giphy.gif","https://media.giphy.com/media/b09xElu8in7Lq/giphy.gif","https://media.giphy.com/media/PFT49iGCp0FBm/giphy.gif", "https://media.giphy.com/media/3ohhwDBA9ieFU9ATqE/giphy.gif","https://media.giphy.com/media/eQH0npwp1GRNK/giphy.gif"],
      "hip hop": ["https://media.giphy.com/media/3o7TKt8AgkMSjBYZPy/giphy.gif","https://media.giphy.com/media/GzIhDeVFffKQo/giphy.gif","https://media.giphy.com/media/3Z1ffVI6XrK5eY3DFg/giphy.gif","https://media.giphy.com/media/Uwhzoeu4JTliU/giphy.gif","https://media.giphy.com/media/v4joJC0Z76mkM/giphy.gif","https://media.giphy.com/media/12l1mqHOBGERa0/giphy.gif","https://media.giphy.com/media/l4KhU5gbqhBzozBYs/giphy.gif","https://media.giphy.com/media/wAxlCmeX1ri1y/giphy.gif"],
      "rap": ["https://media.giphy.com/media/cYJgsdeB6VThe/giphy.gif","https://media.giphy.com/media/6tI6Pe7yoNcdO/giphy.gif","https://media.giphy.com/media/l4EoPJJUsIj9o5dZe/giphy.gif","https://media.giphy.com/media/3oeSAAnVCEuAXXFQd2/giphy.gif", "https://media.giphy.com/media/wAxlCmeX1ri1y/giphy.gif","https://media.giphy.com/media/kmOoBqGnQwls4/giphy.gif"],
      "edm": ["https://media.giphy.com/media/shV6fle6kPu6I/giphy.gif","https://media.giphy.com/media/3o6ZtpWvwnhf34Oj0A/giphy.gif","https://media.giphy.com/media/dxVAZVKa7Lu8Rk9nMb/giphy.gif","https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif","https://media.giphy.com/media/5th9rO28VAVaGHtodG/giphy.gif","https://media.giphy.com/media/1SvpUm98OeKIlsnU63/giphy.gif","https://media.giphy.com/media/3o7TKFXELFFs2roQRG/giphy.gif","https://media.giphy.com/media/gG9qjgZj6pbP2/giphy.gif"],
      "trap": ["https://media.giphy.com/media/3o7TKPfyvkEfPxHGhy/giphy.gif","https://media.giphy.com/media/cYJgsdeB6VThe/giphy.gif", "https://media.giphy.com/media/6tI6Pe7yoNcdO/giphy.gif", "https://media.giphy.com/media/khO4HqGtnqwVjZ0r68/giphy.gif","https://media.giphy.com/media/Z1LYiyIPhnG9O/giphy.gif","https://media.giphy.com/media/7kNog3mqHxxJK/giphy.gif"],
      "alternative": ["https://media.giphy.com/media/vji1ikjCzJT1u/giphy.gif","https://media.giphy.com/media/l1BefraZDNOEbzI85o/giphy.gif","https://media.giphy.com/media/l2JeaBKTrpP2c4A7u/giphy.gif","https://media.giphy.com/media/xT0xelf5NTuwuKNb0Y/giphy.gif"],
      "country":["https://media.giphy.com/media/5qFQgLgyaAGOM4re2w/giphy.gif","https://media.giphy.com/media/jIhWEyt270s02DmIxP/giphy.gif","https://media.giphy.com/media/1lyQJPjV28Wiu1QeiH/giphy.gif","https://media.giphy.com/media/26Ff1y8ZicC4x5wLS/giphy.gif","https://media.giphy.com/media/dXzicViganGAXi2tBa/giphy.gif","https://media.giphy.com/media/LnoxwmDwHVTzceRwa9/giphy.gif"],
      "metal":[], 
      "jazz":[], 
      "r&b":[], 
      "pop":[], 
      "funk":[],
      "soul":[],
      "other":[]
  };
    if (genreIndex != undefined) {
      var max = gifList[genreIndex].length;
      // console.log(gifList[genreIndex]);
      // console.log(max);
      var index = Math.floor(Math.random() * (max - min)) + min;
      console.log("index = " + index)
      console.log( gifList[genreIndex][index])
      this.setState({genreGif: gifList[genreIndex][index]});
      // return linkArray[genre][index];
    }
  }


  render() {
    return (
      <div className="App">
      <h2 id="login">
        <a  href='http://localhost:8888' > Login to Spotify </a></h2>
{/*        <div>
          <img src={im} style={{ height: 300 }}/>
        </div>*/}
        <h4>
        Previous Song: { this.state.nowPlaying.previous }
        </h4>
        <div>
          <img src={this.state.nowPlaying.albumArt} style={{ height: 300 }}/>
        </div>
        <div>
          <img src={this.state.genreGif} style={{ height: 600 }}/>
        </div>
        <h4 id = 'track'>
        Current Song: {this.state.nowPlaying.trackName}</h4>
        <h4>
        {/* Artist ID: {this.state.nowPlaying.artists_id} */}
        </h4>
        <h4>Genre Array: {this.state.genreArray}</h4>
        <h4>Genre: {this.state.genreMax}</h4>
        { this.state.loggedIn }
      </div>
    );
  }

  componentDidMount(){

// Checking to see if the page needs to update
    this.myInterval = setInterval(() => {
// Makes sure the song gets checked to compare
      this.getNowPlaying();
      this.getArtistInfo(this.state.nowPlaying.artists_id);
      this.genreFinder(this.state.genreArray);
      
      
      
// If it's the same it won't do anything
      if (this.state.nowPlaying.trackName === this.state.nowPlaying.previous){
        // console.log('Same song')
        return;
      }
/* If it's different it will set the previous track to the current track
and update the current track*/
      else if (this.state.nowPlaying.trackName !== this.state.nowPlaying.previous){
        
        this.setState({nowPlaying: {
            trackName: this.state.nowPlaying.trackName,
            previous: this.state.nowPlaying.trackName,
            albumArt: this.state.nowPlaying.albumArt,
            artists_id: this.state.nowPlaying.artists_id
          },
          genreMax:this.state.genreMax,

        })
        this.getGifLink(this.state.genreMax);
        

        if (this.state.nowPlaying.artists_id !== '') {
          
          
        }
      }
  }, 750)}
}

export default App;
