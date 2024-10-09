function shoot(direction) {
    const randomSave = Math.random(); // Random save chance for the goalkeeper
    const message = document.getElementById("message");
  
    if (randomSave < 0.3 && direction === "left") {
      message.textContent = "Goalkeeper saves! You missed!";
    } else if (randomSave < 0.6 && direction === "center") {
      message.textContent = "Goalkeeper saves! You missed!";
    } else if (randomSave < 0.9 && direction === "right") {
      message.textContent = "Goalkeeper saves! You missed!";
    } else {
      message.textContent = "Goal!!! You scored!";
    }
  }
  