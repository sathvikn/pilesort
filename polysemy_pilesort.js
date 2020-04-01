/*************************************
   firebase references
 *************************************/
var ref = new Firebase("https://wordsense-pilesort.firebaseio.com/polysemy_pilesort");
//var ref = firebase.database().ref().child("polysemy_pilesort");
var userRef = ref.child("subjectInfo");
var IPuserRef = ref.child("subjectByIP");
var workerIDuserRef = ref.child("subjectByWorkerID");
var stimuliRef = ref.child("inputs");
var trialRef = ref.child("trials");
var thisUserRef;
var userID; //unique hash from firebase
var userIP;
var workerID=getParamFromURL("workerID"); //amazon worker id
var userExists;

/*************************************
   input variables
 *************************************/
//var totalTrials = 6;
var currentIndex = 0; //index of current trial. will start indexing at 1, once newTrial() is called.
var sentenceIndex = 0;
//var sorted = range(1, totalTrials); //int list starting at 1, with length=totalTrials
//var stimuliIndices = shuffle(sorted);
//var wordSpace = ["chicken", "shower"]; //list of possible words, in alphabetical order
//var wordList = shuffle(wordSpace).slice(0,totalTrials); //list of stimuli words for this participant
//var wordList = ["cell", "figure", "foot", "form", "girl", "home", "paper", "table"];
//TODO: Query this from Firebase?
//var totalWordList = ['case','church','family','feet','question','time'] 
var totalWordList = []
var totalTrials = 18
var wordList = []
var homonyms = ['foot_n', 'table_n', 'plane_n', 'degree_n', 'right_n', 'model_n']
var trainWords = ['bank_n', 'bass_n']
stimuliRef.once("value", function(snapshot) {
    allStimuli = snapshot.val()
    Object.keys(allStimuli).forEach(function (key) {
        if (trainWords.indexOf(key) < 0 && homonyms.indexOf(key) < 0) {
            totalWordList.push(key)
        }
    })
    test = shuffle(totalWordList).slice(0, 8);
    redo = test.sample(2)
    wordList = trainWords.concat(homonyms).concat(test).concat(redo)
})

//var wordList = shuffle(totalWordList).slice(0,totalTrials);
var stimuli; //stimuli objects associated with current word
var sentenceKeys = []; //randomized list of sentence keys for current word
var trialSize = 12; //max number of sentences in each trial
var colorlist = ["#C4E17F", "#DB9DBE", "#FECF71", "#F0776C", "#F7FDCA", "#669AE1", "#C49CDE", "#62C2E4"];
var lastClicked;
var previousPositions;
var changesForTrial;

/*************************************
    main
 *************************************/
$(document).ready ( function(){
//     $("#consent").html(consentHTML);
//
  
    var w = window.innerWidth;
    if(w >= 800) {
        $(".start-entered").css("left", (w-800)/2);
    }
    
    //get user info 
    getSubjectInfo();
//
//         
    //newTrial();
    $("#agree").click(function(){
        $("#consent").addClass("hidden");
        $("#intro").removeClass("hidden");
        //newTrial();
    });

    $("#decline").click(function(){
        $("#consent").addClass("hidden");
        $("#declinedExperiment").removeClass("hidden");
    });

    $("#introOK").click(function(){
        $("#intro").addClass("hidden");
        $("#experiment").removeClass("hidden");
        newTrial();
    });

    $("#next").click(function(){
        var updatingPositions = $.Deferred();
        updatePositionData(updatingPositions)
        updatingPositions.done(function() {
            dropOneSentence();
        })
    })

    function updatePositionData(deferredObj) {
        if (sentenceIndex > 0) {
            incrementChangedPositions();
        }
        previousPositions = getPositions(sentenceIndex)
        sentenceIndex += 1;
        deferredObj.resolve()
    }


    $("#submit").click(function() {

        incrementChangedPositions();
        recordTrial();
        
        if(currentIndex <= totalTrials-1){
            var dropSpinner = $.Deferred();
            $("#sentences").empty();
            //$("#dropzone").addClass("hidden");

            spinner = '<a id = "spinner" style= "height: 80vh; width: 20vw;"href="http://www.lowgif.com/d35d94c490e598e3.html" target="_blank"><img id="editableimage2" style = "height: 200px; margin-top: 50px;" src="http://cdn.lowgif.com/full/d35d94c490e598e3-loading-gif-transparent-loading-gif.gif" border="0" alt="Loading Gif Transparent Loading Gif"/></a>'


            $("#dropzone").append(spinner);

            setTimeout(function(){ 
                $("#spinner").remove();
               // $("#dropzone").removeClass("hidden")
                newTrial();
            }, 1000);

            //newTrial();
        } else {
            thisUserRef.update({ endedAt: Firebase.ServerValue.TIMESTAMP });
            thisUserRef.update({ completed: 1 });
            $("#experiment").addClass("hidden");
            $("#finishedExperiment").removeClass("hidden");
            return;
        }
    })


})


/*************************************
    helper functions called in main
 *************************************/
//main trial function; each trial corresponds to one word
function newTrial() {
    // var w = window.innerWidth;
    // var h = window.innerHeight;
    // if(w>915 && h>550){
    //     $("#warning").addClass("hidden");
    // } else{
    //     $("#warning").removeClass("hidden");
    //     $("#warning").html("<p style='color:black'>please only work on this experiment on a computer, and make sure your browser window is large enough to accomondate the canvas.</p>");
    // }
    $("#dropzone").removeClass("hidden")

    currentIndex += 1;
    $('#trialnum').text('Word '+currentIndex.toString()+'/'+totalTrials.toString());

    //clear out old sentences

    //reset variables
    stimuli = {};
    inputSize = 0;
    sentenceKeys = [];
    sentenceIndex = 0;
    changesForTrial = 0;
    $("#submit").addClass("disabled hidden");
    $("#next").addClass("disabled").removeClass("hidden");   
    //get stimuli json
    var getStimuli = $.Deferred();
    stimuliRef.child(wordList[currentIndex-1]).once("value", function(snapshot) {
        stimuli = snapshot.val();
        var inputSize = snapshot.val()["senses"];
        //stimuli.splice(parseInt(snapshot.key())-1, 0, snapshot.val());
        if(inputSize > 0  &&  Object.keys(stimuli).length > inputSize ) {
            //sentenceKeys = sList(inputSize, trialSize);
            $.each(stimuli, function(key, value) {
                if(key!='senses' && key!='type'){sentenceKeys.push(key);}
            });
            sentenceKeys = shuffle(sentenceKeys); //randomize
            getStimuli.resolve();
        }
    })

    

    //load the sentences
    //var loadSentences = $.Deferred();
    getStimuli.done(function() {
        //load instruction keywords
    $("#info").html('<b>Instructions: </b>You will see a total of ' +sentenceKeys.length+ ' definitions of the word <b style="background-color:yellow">' 
        + getWordFromType(wordList[currentIndex-1])+'</b>. Each definition is represented by a numbered square in the grey canvas below. The full content of each definition, as well as an example sentence, will be displayed below the canvas. Drag the squares around in the canvas so that: <ul><li><b>The most closely related meanings for "' 
    +getWordFromType(wordList[currentIndex-1])+ '" are closest to each other</b></li><li><b> Definitions that are related the least are farthest apart</b></li></ul>'+ 'You may see the same word twice, so please ensure these two trials are as consistent as possible. Do not refresh this page until the task is finished, and make sure you can see the whole canvas in your browser.')

        dropOneSentence();
    })
}



//drag-drop run for one sentence
function dropOneSentence(){
    if(sentenceIndex==0){
        $("#warning").removeClass('hidden');
    }
    $("#sensenum").text("Definition " + (sentenceIndex + 1) + " / " + sentenceKeys.length);

    $("#next").addClass("disabled");
    $("#next").addClass("disabled");
    var colorstr = colorlist[sentenceIndex%8];
    var newDivString = ' <div class="draggable" id="';
    var newDiv0 = newDivString.concat (sentenceKeys[sentenceIndex].toString());
    var newDiv00 = newDiv0.concat('" style= "background-color:',colorstr,';position:absolute; left:400px"><h4>');

    var newDiv = newDiv00.concat(sentenceIndex+1, "</h4></div>");
    $( "#sentences" ).append(newDiv);

    lastClicked = sentenceKeys[sentenceIndex].toString();

    $( ".draggable" ).draggable({revert:"invalid"});
    $("#label-text" ).html(stimuli[sentenceKeys[sentenceIndex].toString()]);    
    $("#label").css("background-color", colorstr);
    $("#label-text" ).html(formatSentenceDefn(sentenceKeys[sentenceIndex]));

    

    $( ".draggable" ).mouseover(function() {
        //$("#label-text" ).text(stimuli[this.id]["sentence"]);
        //$("#label").css("background-color", $(this).css("background-color"));
        //this.style.border-style="dashed";
        //$(this).css("border-style", "dashed");
        //$("#hover-text" ).text(stimuli[this.id]["sentence"]);
        if((lastClicked != this.id) ) {
           // var defnSentHTML = '<p>' + stimuli[this.id]['def'] + '</p><p>Example Sentence: ' +  stimuli[this.id]['sent'] + '</p>'
            $("#hover-text" ).html(formatSentenceDefn(this.id));
            $("#hover").css("background-color", $(this).css("background-color"));
            $(this).css("border-style", "dashed");
        }

    })
    .mouseout(function() {
        $(this).css("border-style", "solid");
        
        $( "#hover-text" ).text( "Move your cursor close to a number to see the corresponding sentence." );
        $("#hover").css("background-color", "#ccc");
    })
    .mousedown(function() {
        //$("#label-text" ).text(stimuli[this.id]["sentence"]);
        lastClicked = this.id;
       // var defnSentHTML = '<p>' + stimuli[this.id]['def'] + '</p><p>Example Sentence: ' +  stimuli[this.id]['sent'] + '</p>'
        $("#label-text" ).html(formatSentenceDefn(this.id));

        $("#label").css("background-color", $(this).css("background-color"));
        $(this).css("border-style", "dashed");
        $( "#hover-text" ).text( "Move your cursor close to a number to see the corresponding sentence." );
        $("#hover").css("background-color", "#ccc");

        $(this).css("z-index", 1);

        // ///
        // $( ".draggable" ).mouseover(function() {
        //     //$("#label-text" ).text(stimuli[this.id]["sentence"]);
        //     //$("#label").css("background-color", $(this).css("background-color"));
        //     //this.style.border-style="dashed";
        //     //$(this).css("border-style", "dashed");
        //     $("#hover-text" ).text(stimuli[this.id]["sentence"]);
        //     $("#hover").css("background-color", $(this).css("background-color"));
        //     $(this).css("border-style", "dashed");
        //
        // })
        // .mouseout(function() {
        //     $(this).css("border-style", "solid");
        //     
        //     $( "#hover-text" ).text( "Move your cursor close to a number to see the corresponding sentence." );
        //     $("#hover").css("background-color", "#ccc");
        // })
        // ///

    })
    .mouseup(function() {
        $(this).css("border-style", "solid");

        $( "#label-text" ).text( "Hold your mouse down on a number to see the corresponding sentence" );
        $("#label").css("background-color", "#ccc");

        $(this).css("z-index", 2);

        lastClicked = 0;

        $("#warning").addClass('hidden');
        
    });
}


//function recordTrial(response, inputID) {
function recordTrial() {
    if (currentIndex <= 0) {return;}
    var response = getPositions(sentenceIndex);
    //word = fmtRepeatTrials(wordList, currentIndex);
    trialType = getTrialType(currentIndex - 1)
    trialData = {
        //"inputID":inputID,
        "inputWord": wordList[currentIndex - 1],
        "trialIndex": currentIndex,
        "inputSentences":sentenceKeys,
        "trialType": trialType,
        "userID":userID,
        "response":response,
        "timesPrevTrialsChanged": changesForTrial
    };
    trialRef.push(trialData);
}

function getPositions(index) {
    var positionsJSON = new Object();
    for (var i=0; i<=index; i++) {
        var itemStr = $("#"+sentenceKeys[i])[0].outerHTML;
        var startL = itemStr.indexOf("left");
        var endL = itemStr.indexOf(';', startL);
        var LString = itemStr.substring(startL, endL);
        var startT = itemStr.indexOf("top");
        var endT = itemStr.indexOf(';', startT);
        var TString = itemStr.substring(startT, endT);
        positionsJSON[sentenceKeys[i]] = LString +';'+ TString;
    }
    return positionsJSON
}

function incrementChangedPositions() {
    currPositions = getPositions(sentenceIndex - 1);
    if (JSON.stringify(currPositions) != JSON.stringify(previousPositions)) {
        changesForTrial += 1
    }
}





//send IP and location info to firebase
function getSubjectInfo(){
    var city = null;
    var country = null;
    var getLocation = $.Deferred();
    var IPkey;
    var IDkey;
    var lati;
    var longi;
    var hashedIP;

    $.get("https://wordful-flask.herokuapp.com/ip", function(response) {
        country = response.country_code;
        userIP = response.ip;
        lati = response.latitude;
        longi =  response.longitude;
        city = response.city;

        //IPkey = userIP.toString().split(".").join("_");
        hashedIP = stringToHash(userIP)
        IPkey = hashedIP
        if (workerID) {
            IDkey = workerID;
        } else {
            IDkey = create_UUID();
        }

        
        if (IPkey!=null && IDkey!=null ) {
        //if (IPkey!=null ) {
            getLocation.resolve();
        }
    }, "json")


    

    // Generate a reference to a new location and add some data using push()
    getLocation.done(function() {
        var checkUser = $.Deferred();
        checkIfUserExists(IPkey, IDkey, checkUser);
        //checkUser.resolve();
        

        var jsonData = {userDisplayLanguage: navigator.language,
					userAgent: navigator.userAgent,
					ipAddress: hashedIP,
                    qualtricsWorkerID: IDkey,
                    userCountry: country,
                    latitude: lati,
                    longitude: longi,
                    city: city,
                    //condition: stimuliIndices,
                    condition:wordList,
                    completed:0
                    };

        
                
            
            //IPuserRef.set(IPkey:jsonData);
            checkUser.done(function() {
                var newIPRef = IPuserRef.child(IPkey);
                var newIDRef = workerIDuserRef.child(IDkey);
                //newIPRef.set(jsonData);
                //newIDRef.set(jsonData);

                var newPostRef = userRef.push(jsonData);
                userID = newPostRef.key();
                $("#AMTcode").text(userID);
                thisUserRef = newPostRef;
                thisUserRef.onDisconnect().update({ endedAt: Firebase.ServerValue.TIMESTAMP });
                thisUserRef.update({ startedAt: Firebase.ServerValue.TIMESTAMP });

                newIPRef.set({user: userID});
                newIDRef.set({user: userID});

                Raven.setUserContext({
                    id: userID
                })
                //console.log(userID)

            })
            //workerIDuserRef.set(IDkey:jsonData);


    })
}


/*************************************
   jquery ui script for drag-drop
 *************************************/
$(function() {
    $( ".draggable" ).draggable();
    $( ".droppable" ).droppable({
      drop: function( event, ui ) {
         onCanvasStyle( ui.draggable );
         if (sentenceIndex == sentenceKeys.length-1) {
            $("#next").addClass("hidden");
            $("#submit").removeClass("disabled hidden");
         }
         if (sentenceIndex < sentenceKeys.length-1) {
            $("#next").removeClass("disabled");
         }
      }
    });
  });

function onCanvasStyle($item) {

    //parse to get id string of item
    var itemStr = $item[0].outerHTML;
    var startIndex = itemStr.indexOf("id=") + 4;
    var endIndex = itemStr.indexOf('"', startIndex);
    var idString = itemStr.substring(startIndex, endIndex);

    //change border color
    $("#" + idString).css("border-color", "black");

}


/*************************************
   user IP check
 *************************************/

// function checkIfUserExists(IP, checkUser) {
//     var IPcheck;
//   //var IPRef = new Firebase(USERS_LOCATION);
//   IPuserRef.child(IP).once('value', function(snapshot) {
//     var exists = (snapshot.val() != null);
//     IPExistsCallback(IP, exists);
//     IPcheck = "done";
//     if (userExists != null && IPcheck != null) {
//         checkUser.resolve();
//     }
//   });
//
//   workerIDuserRef.child(workerID).once('value', function(snapshot) {
//     var exists = (snapshot.val() != null);
//     IPExistsCallback(workerID, exists);
//     if (userExists != null && IPcheck != null) {
//         checkUser.resolve();
//     }
//   });
// }

function userExistsCallback(IPD, IPDexists, debug) {
  if (IPDexists && !debug) {
    //alert('user ' + IP + ' exists!');
    $("#consent").addClass("hidden");
    $("#userExists").removeClass("hidden");
  } else {
    userExists = false;
  }
}

// function workerIDExistsCallback(ID, IDexists) {
//   if (IDexists) {
//     //alert('user ' + ID + ' exists!');
//     //$(".container").html(userExistsHTML);
//     $("#consent").addClass("hidden");
//     $("#userExists").removeClass("hidden");
//   } else {
//     //alert('user ' + ID + ' does not exist!');
//     userExists = false;
//   }
// }

 
function checkIfUserExists(IP, workerID, checkUser) {
    var IPcheck;
  //var IPRef = new Firebase(USERS_LOCATION);
  IPuserRef.child(IP).once('value', function(snapshot) {
    var exists1 = (snapshot.val() != null);
    //TODO: Remove the debug field
    debug = getParamFromURL('debug');
    userExistsCallback(IP, exists1, debug);
    IPcheck = "done";
  });

  workerIDuserRef.child(workerID).once('value', function(snapshot) {
    var exists2 = (snapshot.val() != null);
    debug = getParamFromURL('debug');
    userExistsCallback(workerID, exists2, debug);
    if (userExists != null && IPcheck != null) {
        checkUser.resolve();
    }
  });
}



/*************************************
   other helper functions
 *************************************/

Array.prototype.sample = function(numValues){
    //Samples numValues from the array without replacement
    var sampledItems = [];
    while (sampledItems.length != numValues) {
        var randomElem = this[Math.floor(Math.random() * this.length)]
        if (sampledItems.indexOf(randomElem) < 0) {
            sampledItems.push(randomElem)
        }
    }
    return sampledItems;
  }

  function getTrialType(index) {
      if (index == 0 || index == 1) {
          return "training"
      } else if (index >= 2 && index < 8) {
          return "shared"
      } else if (index >= 8 && index < 16) {
          return "test"
      } else {
          return "repeat"
      }
  }
  function stringToHash(string) { 
                  
    var hash = 0; 
      
    if (string.length == 0) return hash; 
      
    for (i = 0; i < string.length; i++) { 
        char = string.charCodeAt(i); 
        hash = ((hash << 5) - hash) + char; 
        hash = hash & hash; 
    } 
      
    return hash; 
} 

  /*function fmtRepeatTrials(wordLst, index) {
      //If a word has been seen before, add a _repeat flag for FB
      currWord = wordLst[index - 1]
      upToWord = wordLst.slice(0, index - 1)
      previouslySeen = false;
      upToWord.forEach(function (w) {
          if(w == currWord) {
            previouslySeen = true;
          }
      })
      if (previouslySeen) {
          currWord = currWord + "_repeat";
      }
      return currWord
  }*/
  
function keywordsHTML(idString) {
    if(idString=="test"){return "test";}
    var keywordList = stimuli[idString]["keywords"];
    var displaytxt = keywordList.join("<br />");
    return displaytxt;
}

function getWordFromType(typeString) {
    return typeString.split("_")[0]
}

function formatSentenceDefn(id) {
    return '<p>' + stimuli[id]['def'] + '</p><p><i>Example Sentence: ' +  stimuli[id]['sent'] + '</i></p>'
}


function range(start, length) { //generates an integer array with specified starting point and length
    var foo = [];
    for (var i = 0; i <= length; i++) {
        foo.push(i+start);
    }
    return foo;
}


function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 != currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}


function sList(inputSize, trialSize) {
    var slist = [];
    var sSize = Math.min(inputSize, trialSize)
    var rlist = shuffle(range(1,inputSize));
    rlist = rlist.slice(0, sSize);
    for (var i = 0; i < sSize; i++) {
        var entry = "s".concat(String(rlist[i]-1));
        slist[i] = entry; 
    }
    return slist;
}


function getParamFromURL( name ){
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if( results == null )
		return "";
	else
		return results[1].split('?')[0];
}

function create_UUID(){
    //From https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}
