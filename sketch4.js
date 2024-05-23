let textContent = '';
let displayText = '';
let charIndex = 0;
let typingInterval = 1; // Interval between each character (in milliseconds)
let lastUpdateTime = 0;
let lastContentHash = ''; // To store the hash of the last text content
let textBoxX = 50; // X-coordinate of the text box
let textBoxY = 50; // Y-coordinate of the text box
let textBoxWidth = 1800; // Width of the text box
let textBoxHeight = 1920; // Height of the text box
let marginX = 20; // Horizontal margin
let marginY = 20; // Vertical margin
let words = [];
let wordIndex = 0;
let wordColors = []; // Array to store colors of each word
let wordFonts = [];

let lastImageUpdateTime = 0;
const numImages = 5; // Number of images in the folder
let images = [];
let imageX = 0;
let imageY = 0;
let imageWidth = 800; // Width of each image
let imageHeight = 150; // Height of each image
let displayedImages = []; // Array to store displayed images and their positions
let video;
let brainrot; // Default initial value for brainrot
let socket;
let fonts = []; // Array to store fonts
let brain_rot_font = 0.2;

let minFontSize = 15; // Minimum font size
let maxFontSize = 90; // Maximum font size
let wordSizes = []; // Array to store font sizes of each word

// List of words to be removed and list of replacement words

function preload() {
  // Load images from the folder
  for (let i = 1; i <= numImages; i++) {
    images.push(loadImage(`images/image (${i}).png`));
  }
  video = createVideo('gta.mp4');

  // Load fonts
  fonts.push(loadFont('font1.ttf'));
  fonts.push(loadFont('font2.ttf'));
  fonts.push(loadFont('font3.ttf'));
  fonts.push(loadFont('font4.ttf'));
  fonts.push(loadFont('font5.ttf'));
}

function setup() {
  createCanvas(1920, 1200);
  background(220);
  textSize(64);
  fill(0);
  textWrap(WORD);
  loadText(); // Initial load of the text file
  setInterval(loadText, 5000); // Check for updates every 5 seconds
  video.loop();
  video.hide();
  video.time(random(0, 606));

  setInterval(() => {
    fetch('brainrot.json')
      .then(response => response.json())
      .then(data => {
        // Ensure the data array exists and has at least four elements
        if (data.data && data.data.length >= 4) {
          // The fourth element in the array is at index 3
          let fourthValue = data.data[3];
          // Parse the string to an integer and ensure it is a number
          brainrot = parseInt(fourthValue.trim(), 10);
          console.log('Updated brainrot value:', brainrot);
        } else {
          console.error('Data format incorrect or insufficient data:', data);
        }
      })
      .catch(error => console.error('Failed to fetch brainrot:', error));
  }, 1000); // Update brainrot every second, adjust timing as needed  
}

function filterText(text) {
  // This function currently does not modify the text and returns it as is.
  // Modify this function based on your specific text filtering needs.
  return text;
}


function draw() {
  background(66, 93, 245); // Clear the canvas each frame

  if (brainrot==31){
    brainrot=30;
    loadText();
  }

  brain_rot_font = map(brainrot, 30, 2, 0, 1);

  image(video, 0, 0, width, height);
  text(brainrot, 100, 1000, 1030);
  if (brainrot !== undefined) {
    filter(POSTERIZE, brainrot); // Use the brainrot value from the JSON file
  }

  if (millis() - lastImageUpdateTime > 10000 && brainrot <= 20) {
    console.log("ready for image");
    imageX = random(0, width - imageWidth);
    imageY = random(0, height - imageHeight);
    let displayedImage = {
      img: images[Math.floor(Math.random() * images.length)],
      x: imageX,
      y: imageY,
      w: imageWidth,
      h: imageHeight
    };
    displayedImages.push(displayedImage);

    // Update lastImageUpdateTime by decreasing it based on brainrot
    // The more the brainrot, the less time to wait for the next update
    lastImageUpdateTime = millis() - brainrot * 200; // Decreases delay by 500 ms per brainrot unit

    // Ensure lastImageUpdateTime does not go below zero or any set minimum
    lastImageUpdateTime = Math.max(lastImageUpdateTime, 0);
  }

  // Render all images stored in the array
  for (let imgData of displayedImages) {
    image(imgData.img, imgData.x, imgData.y, imgData.w, imgData.h);
  }

  displayTextContent(); // Display the text content with potential highlights
  
  // Check if enough time has passed since the last update
  if (millis() - lastUpdateTime > typingInterval) {
    if (charIndex < textContent.length) {
      const nextChar = textContent.charAt(charIndex);
      displayText += nextChar;
      charIndex++;

      // Check if the next character completes a word
      if (nextChar === ' ' || charIndex === textContent.length) {
        const currentWord = words[wordIndex];
        if (Math.random() < 0.1) { // 10% chance to make the word red
          wordColors[wordIndex] = color(255, 0, 0);
        } else {
          wordColors[wordIndex] = color(0); // Default color
        }

        if (Math.random() < brain_rot_font) { // 20% chance to change the font
          wordFonts[wordIndex] = random(fonts);
        } else {
          wordFonts[wordIndex] = 'Helvetica'; // Default font
        }

        if (Math.random() < brain_rot_font) { // 20% chance to change the font size
          wordSizes[wordIndex] = random(minFontSize, maxFontSize);
        } else {
          wordSizes[wordIndex] = 32; // Default font size
        }

        wordIndex++;

        lastUpdateTime = millis(); // Update the last update time
      }
    }
  }
}

function loadText() {
  fetch('generated_text.txt')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      const currentContentHash = hashString(data);
      if (currentContentHash !== lastContentHash) {
        // If the content has changed, update the text and reset variables
        if (brainrot>20 && brainrot<31){
          textContent = filterText(data);
          console.log('replacing text');
        }else{
          textContent=data;
          console.log('not replacing text');
        }
        displayText = '';
        charIndex = 0;
        lastUpdateTime = millis(); // Reset the last update time
        lastContentHash = currentContentHash; // Update the hash
        words = textContent.split(/\s+/); // Split the text content into words
        wordIndex = 0;
        wordColors = new Array(words.length).fill(color(0)); // Reset word colors
        wordFonts = new Array(words.length).fill('Helvetica'); // Reset word fonts
        wordSizes = new Array(words.length).fill(32); // Reset word sizes
      }
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
    });
}

function displayTextContent() {
  let x = textBoxX + marginX;
  let y = textBoxY + marginY + textSize(); // Start y at the baseline of the first line
  let spaceWidth = textWidth(' ');

  // Split displayText into words and render each word
  let displayedWords = displayText.trim().split(/\s+/);
  for (let i = 0; i < displayedWords.length; i++) {
      let word = displayedWords[i];
      let filteredWord = word;

      let wordWidth = textWidth(filteredWord);

      // Ensure the color is valid before using it
      if (wordColors[i]) {
          fill(wordColors[i]); // Set the fill color for the current word
      } else {
          fill(0); // Default to black if no color is set
      }

      stroke(255);
      strokeWeight(2);

      // Set the font for the current word
      if (wordFonts[i]) {
          textFont(wordFonts[i]);
      } else {
          textFont('Helvetica'); // Default font if no font is set
      }

      // Check if the word fits in the current line
      if (x + wordWidth > textBoxX + textBoxWidth - marginX) {
          x = textBoxX + marginX; // Reset x to the left edge
          y += textSize(); // Move y down by one line height
      }

      text(filteredWord, x, y);
      x += wordWidth + spaceWidth; // Move x to the next word position
  }
}


function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
