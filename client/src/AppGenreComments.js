/* client/src/App.js */

import React, { Component } from 'react';
import './App.css';
import * as SpotifyWebApi from 'spotify-web-api-js';

// import SpotifyWebApi from 'spotify-web-api-js';
import im from './butters.gif'

const spotifyApi = new SpotifyWebApi();
// const genreList = ["rap", "hip hop", "rock", "alternative", "country", "trap", "metal", "jazz", "r&b", "pop", "funk", "edm", "country rap", "soul"];
// var genreCount = {"rap":0, "hip hop":0, "rock":0, "alternative":0, "country":0, "trap":0, "metal":0, "jazz":0, "r&b":0, "pop":0, "funk":0, "edm":0, "country rap":0, "soul":0};
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
      genreMax:''
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
    // console.log(response.genres);
    // return data.genres
    this.setState({
      genreArray: response.genres}
    );
    // console.log(data.genres)
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
                    // this.setState({genreMax: genreInstance});
                    
                    // console.log("This is the highest genre " + genreMax + ' = ' + genreMaxNum);
                }
            
        })
        
    }
    // console.log(genreFrequency);
    // console.log(genreFrequency);
    this.setState({genreMax: genreInstance});
    // console.log(this.state.genreMax);
    // console.log("The highest instanced genre:\n" + genreInstance + " = " + genreMaxNum);
    // return genreFrequency, genreMax;

}

//   genreFinder(genreArray) {
//     const genreList = ["rap", "hip hop", "rock", "alternative", "country", "trap", "metal", "jazz", "r&b", "pop", "funk", "edm", "country rap", "soul"];
//     var genreFrequency = {"rap":0, "hip hop":0, "rock":0, "alternative":0, "country":0, "trap":0, "metal":0, "jazz":0, "r&b":0, "pop":0, "funk":0, "edm":0, "country rap":0, "soul":0};
//     var genreInstance = '';

//     if (genreArray.length === 0) {
//       var genreInstance = 'N/A'
//     }

//     else {
//         genreList.forEach(genre => {
//           var genreMaxNum = 0;
//             for (var i = 0; i < genreArray.length; i++) {

//                 if (genreArray[i].includes(genre)) {
//                     genreFrequency[genre] ++;
//                 }
//             }

//                 if (genreFrequency[genre] > genreMaxNum) {
//                     genreMaxNum = genreFrequency[genre];
//                     genreInstance = genre;
                    
//                     console.log("This is the highest genre " + genreMaxNum);
//                     console.log("This is the highest genre " + genreMax);
//                 }

//                 // else {this.setState({genreMax: 'N/A'});}
            
//         })
        
//     }
//     this.setState({genreMax: genreInstance});
//     console.log(genreFrequency);
//     console.log("The highest instanced genre:\n" + this.state.genreMax + " = " + genreMaxNum);
//     // return genreFrequency, genreMax;

// }



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
          genreMax:this.state.genreMax
        })

        if (this.state.nowPlaying.artists_id !== '') {
          
          
        }
      }
  }, 750)}
}

export default App;
