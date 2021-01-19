// const genreList = ["rap", "hip hop", "rock", "alternative", "country", "trap", "metal", "jazz", "r&b", "pop", "funk", "edm", "country rap", "soul"];
// var genreCount = {"rap":0, "hip hop":0, "rock":0, "alternative":0, "country":0, "trap":0, "metal":0, "jazz":0, "r&b":0, "pop":0, "funk":0, "edm":0, "country rap":0, "soul":0};

  /*Make object for counting genres genreFinder(input)
    - loop through genresList use forEach()
    - use .include()
    - make key the genreArray[i]
    - add to that key value
    - at end of loop reset the object
    - returns i.e. frequency = {rap: 3, edm: 5, country:0,..., jazz:0}
    - if found once => frequency[input] ++;
    */
   genreFinder(genreArray){

    const genreList = ["rap", "hip hop", "rock", "alternative", "country", "trap", "metal", "jazz", "r&b", "pop", "funk", "edm", "country rap", "soul"];
    var genreCount = {"rap":0, "hip hop":0, "rock":0, "alternative":0, "country":0, "trap":0, "metal":0, "jazz":0, "r&b":0, "pop":0, "funk":0, "edm":0, "country rap":0, "soul":0};

    if (genreArray[0] === '') {
      var gif = false;
    }

    else {
    //   function countGenre(item) {
    //     for (var i = 0; i < genreArray.length; i++) {
    //       if (genreArray[i].includes(item)) {
            
    //       }
    //   }
      genreList.forEach(genre => {
        for (var i = 0; i < genreArray.length; i++) {
            if (genreCount[i].includes(genre)) {
                genreCount[genre] ++;
              
            }
        }

      })
    }

  }
var test1 = ["alternative rap", "country rap", "indie rock", "punk metal", "punk"];
  console.log(genreFinder(test1))