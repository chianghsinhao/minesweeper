/*

Minesweeper

Author: Tom Chiang
email: chianghsinhao@gmail.com

*/

// default number of mines
var numMines = 30;

// map dimension
var height = 20;
var width = 20;

// 1-D array storing the idx of mines
var mineIdxArray;

// 2-D array storing
//    -1: if the cell has not been clicked
//     0: if the cell was opened
//     1: if the cell has flag marked
//  left click -1 -> 0
//  right click -1 <-> 1
var mineMap;

// 2-D array storing 0~8 for adjacent mine of this cell
var mineCntMap;

// count number of flags
var flagCnt = 0;

// count total number of processed cells
var procCnt = 0;

// 1 lose; 2 win
var gameResult = 0;

// to handle simultaneous click
var leftButtonDown = false;
var rightButtonDown = false;
var bothButtonDown = false;

// time counter in seconds
var tsec = 0;
var timeStart = false;

// these are only used by quickOpen callbacks
var mines = [];
var unopened = [];
var flagged = [];

// text color array
var textColor = ['', 'blue', 'green', 'red', 'purple',
    'maroon', 'turquoise', 'black', 'gray'];

// callback function to create a table of given height and width
function makeGrid(h, w) {
  let retStr = '<table id=\"cellTable\"><tbody>';
  for (let i = 0; i < h; ++i) {
    retStr += '<tr id=\"row' + i + '\">';
    for (let j = 0; j < w; ++j) {
      retStr += '<td id=\"row' + i + 'col' + j + '\"></td>';
    }
    retStr += '</tr>';
  }
  retStr += '</tbody></table>';
  return retStr;
}

// callback function used by generateMineCntMap
function incrementMineCnt(h, w) {
  mineCntMap[h][w]++;
}

// generate adjacent mine cnt for each cell
function generateMineCntMap() {
  mineCntMap = zeros([height, width]);
  mineIdxArray.forEach(function(element){
    let r = Math.floor(element / width);
    let c = element % width;
    handleAdjacentCells(incrementMineCnt, [r, c]);
  });
}

// This function is called at init time or when user resets the map;
// it generates a set of random idx and resets all variables
function generateMineMap(h, w) {
  // first generate mineIdxArray
  // generate a number between [0:numCells-1]
  mineIdxArray = [];
  let numCells = h * w;
  let i = 0;
  do {
    let mineIdx = Math.floor(Math.random() * numCells);
    if (!mineIdxArray.includes(mineIdx)) {
      mineIdxArray.push(mineIdx);
      i++;
    }
  } while (i < numMines);
  //console.log(mineIdxArray);

  // init global value
  mineMap = minusOnes([h, w]);
  generateMineCntMap();
  flagCnt = 0;
  procCnt = 0;
  gameResult = 0;
  $('#gameResult').text('');
}

// This function is called when the player left-clicks the cell, or when quickOpen
// is invoked.
// input: [row,col] pair
// 1. set result to lose if it's a mine cell
// 2. if adjacent mine cnt > 0, display it
// 3. if no adjacent mine, recusively call neighbor cells
function mineCntTest(h, w) {
  let idxPair = [h, w];

  //sanity check if input is valid; no need, assuming input is always valid
  //if (idxPair[0] < 0 || idxPair[1] < 0) {
  //  console.log('negative ' + idxPair);
  //  return;
  //}

  // quickOpen might call this with idx that has been processed
  if (cellClicked(idxPair)) {
    return;
  }

  // this will never be true during recursive call;
  // might be true due to player click or quickOpen
  let flatIdx = h * width + w;
  if (mineIdxArray.includes(flatIdx)) {
    //$('#row' + h + 'col' + w).css('background-color', 'red');
    $('#row' + h + 'col' + w).html('<img class="cellImg" id="row' + h + 'col' + w + 'img" src="img/bomb.png">');
    $('#gameResult').text('LOSE!');
    gameResult = 1;
    return;
  }

  let mineCnt = mineCntMap[h][w];

  // mark mineMap as processed
  mineMap[h][w] = 0;
  procCnt++;

  $('#row' + h + 'col' + w).css('background-color', 'white');

  if (mineCnt > 0) {
    // found adjacent mines, print cnt and stop processing more cells
    $('#row' + h + 'col' + w).text(mineCnt);
    $('#row' + h + 'col' + w).css('color', textColor[mineCnt]);
  }
  else {
    handleAdjacentCells(mineCntTest, idxPair);
  }
}

// callback function used by quickOpen to setup arrays
// that are used to determine if flag matches mine cnt
function quickOpenSetup(h, w) {
  if (mineIdxArray.includes((h) * width + (w))) {
    mines.push(h, w);
  }
  if (mineMap[h][w] === -1) {
    // push a pair into array each time
    unopened.push(h, w);
  }
  else if (mineMap[h][w] === 1) {
    flagged.push(h, w);
  }
}

// This function is called when player clicks on an opened cell with both
// left and right button.
// 1. Collects flagged, unopened, and mine info for adjacent cells
// 2. If flag matches mine cnt, do left click for all unopene cells
function quickOpen(idxPair) {

  // setup these arrays to determine if we need to click adjacent cells
  flagged = [];
  unopened = [];
  mines = [];
  handleAdjacentCells(quickOpenSetup, idxPair);

  if ((flagged.length > 0) && (flagged.length === mines.length)) {
    while (unopened.length) {
      let pair = unopened.splice(0, 2);
      mineCntTest(pair[0], pair[1]);
    }
  }

  checkWiningCondition();

  // Mark wrong flags when lost
  if (gameResult === 1) {
    while (flagged.length) {
      let pair = flagged.splice(0, 2);
      let mineIdx = pair[0] * width + pair[1];
      if (!mineIdxArray.includes(mineIdx)) {
        $('#row' + pair[0] + 'col' + pair[1]).text('X');
      }
    }
  }
}

// callback when player press either left or right mouse button;
// sets up button down flags and toggle cell colors if it's not clicked yet
function mouseDownHandler(e) {
  if (gameResult != 0) {
    return;
  }
  let cell = strToRC(e.target.id);

  if ((!leftButtonDown) && e.buttons & 1) {
    leftButtonDown = true;

    if (!cellClicked(cell)) {
      // change to slategrey if cell has not been clicked yet
      $('#' + e.target.id).css('background-color', 'slategrey');
    }

    if (rightButtonDown) {
      // change back to light grey
      if (!cellClicked(cell)) {
        $('#' + e.target.id).css('background-color', 'lightgrey');
      }
      bothButtonDown = true;
    }
  }
  else if ((!rightButtonDown) && e.buttons & 2) {
    rightButtonDown = true;
    if (leftButtonDown) {
      // change back to light grey
      if (!cellClicked(cell)) {
        $('#' + e.target.id).css('background-color', 'lightgrey');
      }
      bothButtonDown = true;
    }
  }
}

// callback when player moves mouse of a cell;
// handle cell color change if left click and dragging;
// handle cell color change if moving to another cell
function mouseOutHandler(e) {
  if (gameResult != 0) {
    return;
  }
  if (bothButtonDown) {
    return;
  }

  if (e.buttons & 1) {
    let cell = strToRC(e.target.id);

    // revert to light grey if it's not clicked yet
    if (!cellClicked(cell)) {
      $('#' + e.target.id).css('background-color', 'lightgrey');
    }

    // handle target element if it's a cell
    if (e.toElement.id.includes('row') &&
        e.toElement.id.includes('col')) {
      let targetCell = strToRC(e.toElement.id);
      if (!cellClicked(targetCell)) {
        $('#' + e.toElement.id).css('background-color', 'slategrey');
      }
    }
  }
}

// callback when player release a mouse button;
// if both button clicked, just handle state change
// if only one button clicked, handle left or right click event
function mouseUpHandler(e) {
  if (gameResult != 0) {
    return;
  }

  let currCell = strToRC(e.target.id);

  if (e.which === 1) {
    leftButtonDown = false;
    if (bothButtonDown) {
      if (rightButtonDown) {
        // left release after both botton press; don't do anyhing
      }
      else {
        // both-botton click is identified

        if (!timeStart) {
          setTimeout(timeCounter, 1000);
          timeStart = true;
        }

        bothButtonDown = false;
        if (cellOpened(currCell)) {
          quickOpen(currCell);
        }
      }
      return;
    }

    if (cellClicked(currCell)) {
      return;
    }

    // if reaches here, means left click is identified
    if (!timeStart) {
      setTimeout(timeCounter, 1000);
      timeStart = true;
    }

    $('#row' + currCell[0] + 'col' + currCell[1]).css('background-color', 'white');
    mineCntTest(currCell[0], currCell[1]);
    checkWiningCondition();
  }
  else if (e.which === 3) {
    rightButtonDown = false;

    if (bothButtonDown) {
      if (leftButtonDown) {
        // right release after both botton press; don't do anyhing
      }
      else {
        // both-botton click is identified

        if (!timeStart) {
          setTimeout(timeCounter, 1000);
          timeStart = true;
        }

        bothButtonDown = false;
        if (cellOpened(currCell)) {
          quickOpen(currCell);
        }
      }
      return;
    }

    // if reaches here, means left click is identified
    if (!timeStart) {
      setTimeout(timeCounter, 1000);
      timeStart = true;
    }

    // toggle flag
    if (!cellClicked(currCell)) {
      $('#row' + currCell[0] + 'col' + currCell[1]).html('<img class="cellImg" id="row' + currCell[0] + 'col' + currCell[1] + 'img" src="img/flag.png">');
      //$('#' + e.target.id).css('background-color', 'pink');
      mineMap[currCell[0]][currCell[1]] = 1;
      flagCnt++;
    }
    else if (mineMap[currCell[0]][currCell[1]] === 1) {
      $('#row' + currCell[0] + 'col' + currCell[1]).children().remove();
      //$('#row' + currCell[0] + 'col' + currCell[1]).css('background-color', 'lightgrey');
      mineMap[currCell[0]][currCell[1]] = -1;
      flagCnt--;
    }
    $('#mineFlagged').val(flagCnt);
  }
}

// prevent right click menu
document.oncontextmenu = function() {
    return false;
}

jQuery(document).ready(function(e) {

// Create a default 20x20 table
$('#canvas').html(makeGrid(20, 20));
generateMineMap(20, 20);

// Setup click event to update mineMap
$('#submit').click(function(){
  // Get inputs
  numMines = Number($('#numMines').val());
  height = Number($('#height').val());
  width = Number($('#width').val());

  if (numMines > (height * width)) {
    setTimeout(function() {
      alert('Number of mines cannot exceed map size!'); }, 1
    );
    return;
  }

  // Generate map
  $('#cellTable').remove();
  $('#canvas').html(makeGrid(height, width));
  generateMineMap(height, width);

  //Re-register mouse events
  $('#cellTable tbody tr td').mousedown(mouseDownHandler);
  $('#cellTable tbody tr td').mouseout(mouseOutHandler);
  $('#cellTable tbody tr td').mouseup(mouseUpHandler);
  $('#cellTable tbody tr td').mousemove(unFocus);
  $('#cellTable').css('cursor', 'pointer');

  // reset a few varriables
  tsec = 0;
  timeStart = false;
  $('#timeText').val(0);
  $('#mineFlagged').val(0);
});

// Setup mouse events
$('#cellTable tbody tr td').mousedown(mouseDownHandler);
$('#cellTable tbody tr td').mouseout(mouseOutHandler);
$('#cellTable tbody tr td').mouseup(mouseUpHandler);
$('#cellTable tbody tr td').mousemove(unFocus);
$('#cellTable').css('cursor', 'pointer');
});

// -------------------- helper functions -------------------------

// create a multi-dimension array of -1s
function minusOnes(dimensions) {
  let array = [];
  for (let i = 0; i < dimensions[0]; ++i) {
    array.push(dimensions.length == 1 ? -1 : minusOnes(dimensions.slice(1)));
  }
  return array;
}

// creates a multi-dimension array of 0s
function zeros(dimensions) {
  let array = [];
  for (let i = 0; i < dimensions[0]; ++i) {
    array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
  }
  return array;
}

// check if player wins; display winning text
function checkWiningCondition() {
  if (numMines + procCnt === height * width) {
    $('#gameResult').text('WIN!');
    gameResult = 2;
  }
}

// transform a string 'rowXXcolYY' to row-column array [XX, YY] where
// XX and YY are numbers
// also support img in the cell with id 'rowXcolYYimg'
function strToRC(str) {
  let arr = str.split(/row|col|img/);
  arr.shift();
  return [Number(arr[0]), Number(arr[1])];
}

// input: 2-element array of row and column idx
// return: true if the cell has already been processed
function cellClicked(idxArr) {
  return (mineMap[idxArr[0]][idxArr[1]] === -1)? false: true;
}

// input: 2-element array of row and column idx
// return: true if the cell has already been processed
function cellOpened(idxArr) {
  return (mineMap[idxArr[0]][idxArr[1]] === 0)? true: false;
}

// prevent mouse drag from selecting
function unFocus() {
  if (document.selection) {
    document.selection.empty()
  } else {
    window.getSelection().removeAllRanges()
  }
}

// Work on 8 adjacent cells; except out-of-bound ones
// func: function to call in the body
// args: 2-element array, pair of center cell idx
function handleAdjacentCells(func, args) {
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      // skip the cell itself
      if (r===0 && c===0) {
        continue;
      }
      // skip out-of-bound
      if ((args[0]+r) < 0 || (args[0]+r) >= height ||
          (args[1]+c) < 0 || (args[1]+c) >= width) {
        continue;
      }

      func.apply(null, [args[0]+r, args[1]+c]);
    }
  }
}

// callback for timer event; increment time by one second before game ends;
// and setup net event
function timeCounter() {
  tsec++;
  $('#timeText').val(tsec);
  if (timeStart && (gameResult === 0)) {
    setTimeout(timeCounter, 1000);
  }
}
