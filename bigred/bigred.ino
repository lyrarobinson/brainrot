const int buttonPin = 2; // the number of the pushbutton pin
int buttonState = 0;     // variable for reading the pushbutton status
int lastButtonState = LOW; // previous state of the button initialized to LOW
int brainrot = 0;        // the variable to increment on button press
int mapBrainrot;
int prompt;

void setup() {
  pinMode(buttonPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  buttonState = digitalRead(buttonPin);

  // Check if the button state has changed from high to low (button press)
  if (buttonState == HIGH && lastButtonState == LOW) {
    delay(10); // simple software debouncing
    if (digitalRead(buttonPin) == HIGH) { // double check the button state after a delay
      brainrot++;
      if (brainrot > 9) {
        brainrot = 0;
      }

      mapBrainrot = map(brainrot, 0, 9, 30, 2);
      float temp = map(brainrot, 0, 9, 20, 120) / 100.0;
      float penalty = map(brainrot, 0, 9, 100, 180) / 100.0;

      if (brainrot == 0 || brainrot == 1) {
        prompt = 1;
      } else if (brainrot >= 2 && brainrot <= 6){
        prompt = 2;
      } else if (brainrot == 7 || brainrot == 8){
        prompt = 3;
      } else if (brainrot == 9) {
        prompt = 4;
      }

      Serial.print(prompt);
      Serial.print(", ");
      Serial.print(temp, 1);
      Serial.print(", ");
      Serial.print(penalty, 1);
      Serial.print(", ");
      Serial.println(mapBrainrot);

      delay(100); // delay for the button debounce
    }
  }

  // Save the current state as the last state, for the next loop iteration
  lastButtonState = buttonState;
}


