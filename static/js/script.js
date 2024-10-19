function getTime() {
  const d = new Date();
  let hour = d.getHours();

  if (hour > 12) {
    hour -= 12;
  }
  
  let min = d.getMinutes();
  if (min.toString().length === 1) {
    min = "0" + min;
  }
  
  return hour + ":" + min;
}

function addText(text) {
  let li = document.createElement("li");
  li.className = "clearfix";
  li.innerHTML = `<div class="chat-avatar"><img src="static/images/users/avatar-5.jpg" class="rounded" alt="Rena" /><i>${getTime()}</i></div><div class="conversation-text"><div class="ctext-wrap"><i>Rena</i><p>${text}</p></div></div>`;
  return li
}

function httpGet(param) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", `http://raspberrypi.local/${param}`, true);
  xmlHttp.send(null);
}

const texts = document.querySelector("ul");

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.interimResults = true;

window.onload = function() {
  texts.appendChild(addText("Hello darling!"));
}

function scroll() {
  var elem = document.getElementById("conversation-list");
  elem.scrollTop = elem.scrollHeight;
}

function filter(text, mode) {
  li.classList.add("odd");
  li.innerHTML = `<div class="chat-avatar"><img src="static/images/users/avatar-1.jpg" class="rounded" alt="Codejapoe" /><i>${getTime()}</i></div><div class="conversation-text"><div class="ctext-wrap"><i>Codejapoe</i><p>${text}</p></div></div>`;
  texts.appendChild(li);

  if (text.includes("hello")) {
    texts.appendChild(addText("Hello, darling!"));
  } else if (text.includes("who are you") || text.includes("your name")) {
    texts.appendChild(addText("I am Rena, an AI Home Assistant created by Codejapoe."));
  } else if (text.includes("open YouTube")) {
    texts.appendChild(addText("Opening Youtube..."));
    window.open("https://www.youtube.com/", "_blank");
  } else if (text.includes("study mode") || text.includes("steady mode")) {
    texts.appendChild(addText("Opening Canvas and ChatGPT..."));
    window.open("https://deanza.instructure.com/", "_blank");
    window.open("https://chat.openai.com/", "_blank");
  } else if (text.includes("time") && text.includes("now")) {
    texts.appendChild(addText(`It's ${getTime()} now.`));
  } else if (text.includes("charge my laptop") || text.includes("charging on")) {
    httpGet("socket1_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("discharge my laptop") || text.includes("charging off")) {
    httpGet("socket1_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("reading mode on")) {
    httpGet("socket2_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("reading mode off")) {
    httpGet("socket2_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("bed light on")) {
    httpGet("socket3_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("bed light off")) {
    httpGet("socket3_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("projector on")) {
    httpGet("ast_projector_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("projector off")) {
    httpGet("ast_projector_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("desk light on")) {
    httpGet("dragon_rbg_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("desk light off")) {
    httpGet("dragon_rbg_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("pink light")) {
    httpGet("ast_projector_pink")
    httpGet("dragon_rbg_pink")
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("blue light")) {
    httpGet("ast_projector_blue")
    httpGet("dragon_rbg_blue")
    texts.appendChild(addText("Done, darling."));
  } else if (text === "light on" || text === "lights on") {
    httpGet("lights_on");
    texts.appendChild(addText("Done, darling."));
  } else if (text === "light off" || text === "lights off") {
    httpGet("lights_off");
    texts.appendChild(addText("Done, darling."));
  } else if (text.includes("sleep mode") || text.includes("turn off everything")) {
    httpGet("sleep");
    texts.appendChild(addText("Good night, darling."));
  } else if (text.includes("next")) {
    httpGet("next");
    texts.appendChild(addText("Done changing the astronaut projector's color, darling"));
  } else {
    if (mode === "voice") {
      texts.appendChild(addText("Sorry I don't understand, darling."));
    } else {
      fetch("http://raspberrypi.local/meta_ai", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(text)
        })
        .then(response => response.json())
        .then(responseData => {
          texts.appendChild(addText(responseData['message']));
          let sources = responseData['sources'];
          let str = ``;
          if (sources.length !== 0) {
            str += "<h4>Sources</h4>";
            sources.forEach(source => {
              str += `<b>Title:</b> ${source.title}<br><b>Link:</b> <a href="${source.link}" target="_blank">${source.link}</a><br><br>`;
            })
            str = str.substring(0, str.length - 8);
            texts.appendChild(addText(str));
          }
        })
        .catch(error => {
          texts.appendChild(addText(`Error occurred.<br>${error}`));
        });
    }
  }

  li = document.createElement("li");
  li.className = "clearfix";
  scroll();
}

const textInput = document.getElementById('command');
textInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    filter(textInput.value, "text");
    textInput.value = "";
  }
});

let li = document.createElement("li");
li.className = "clearfix";

recognition.addEventListener("result", (e) => {
  const text = Array.from(e.results)
    .map((result) => result[0])
    .map((result) => result.transcript)
    .join("");

  if (e.results[0].isFinal) {
    filter(text, "voice");
  }
});

recognition.addEventListener("end", () => {
  recognition.start();
});

recognition.start();