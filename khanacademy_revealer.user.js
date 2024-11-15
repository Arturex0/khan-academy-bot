// ==UserScript==
// @name         Khan Academy Bot
// @version      2.0
// @namespace    https://github.com/Arturex0
// @description  anwser script
// @author       Artur Szczurowski; https://github.com/Arturex0
// @match        https://www.khanacademy.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=khanacademy.org
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  window.loaded = false;
  let answerWindowVisible = false;

  // Inject KaTeX CSS and JS
  const katexCSS = document.createElement("link");
  katexCSS.href =
    "https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css";
  katexCSS.rel = "stylesheet";
  document.head.appendChild(katexCSS);

  const katexScript = document.createElement("script");
  katexScript.src =
    "https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.js";
  document.head.appendChild(katexScript);

  // Create the draggable overlay window
  const answerWindow = document.createElement("div");
  Object.assign(answerWindow.style, {
    position: "fixed",
    top: "10%",
    left: "10%",
    width: "400px",
    height: "300px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    color: "black",
    border: "2px solid black",
    borderRadius: "10px",
    padding: "15px",
    fontSize: "14px",
    overflowY: "auto",
    zIndex: "1000",
    display: "none", // Hidden initially
    cursor: "move",
  });
  document.body.appendChild(answerWindow);

  // Toggle the visibility of the answer window
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "q") {
      answerWindowVisible = !answerWindowVisible;
      answerWindow.style.display = answerWindowVisible ? "block" : "none";
    }
  });

  // Make the window draggable
  let isDragging = false;
  let offsetX, offsetY;

  answerWindow.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetX = event.clientX - answerWindow.offsetLeft;
    offsetY = event.clientY - answerWindow.offsetTop;
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      answerWindow.style.left = `${event.clientX - offsetX}px`;
      answerWindow.style.top = `${event.clientY - offsetY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  class Answer {
    constructor(answer, type) {
      this.body = answer;
      this.type = type;
    }

    get isMultiChoice() {
      return this.type === "multiple_choice";
    }

    get isFreeResponse() {
      return this.type === "free_response";
    }

    get isExpression() {
      return this.type === "expression";
    }

    get isDropdown() {
      return this.type === "dropdown";
    }

    log() {
      const answer = this.body;
      answer.map((ans, idx) => {
        if (typeof ans === "string" && ans.includes("web+graphie")) {
          this.body[idx] = "";
          this.printImage(ans);
        } else if (typeof ans === "string") {
          answer[idx] = ans.replaceAll("$", "");
        }
      });

      const text = answer.join("\n").trim();
      if (text) {
        console.log(
          `%c${text}`,
          "color: coral; font-size: 16px; font-weight: bold;"
        );


        this.addAnswerToWindow(text);
      }
    }

    addAnswerToWindow(text) {
        // Create the parent container for the entire answer block
        const answerElement = document.createElement("div");
        answerElement.style.padding = "10px";
        answerElement.style.marginBottom = "10px";
        answerElement.style.borderBottom = "1px solid #ccc";

        // Split answers by line (assuming each answer is on a new line in 'text')
        const answers = text.split("\n");

        answers.forEach(answerText => {
            // Create a child div for each individual answer
            const childAnswerElement = document.createElement("div");
            childAnswerElement.style.marginBottom = "5px"; // Space between answers

            try {
                katex.render(answerText, childAnswerElement, { throwOnError: false });
            } catch (e) {
                childAnswerElement.innerText = answerText; // fallback in case of rendering error
            }

            // Append each child answer div to the parent answer element
            answerElement.appendChild(childAnswerElement);
        });

        // Append the entire answer block to the answer window
        answerWindow.appendChild(answerElement);
    }

    printImage(ans) {

        // Extract just the URL part, removing all extra text
        const url = ans.match(/\(web\+graphie:\/\/[^\)]+\)/)[0]
                      .replace("(web+graphie://", "https://")
                      .replace(")", ".svg");

        const imgElement = new Image();
        imgElement.src = url;
        imgElement.style.maxWidth = "100%";
        imgElement.style.marginBottom = "10px";

        answerWindow.appendChild(imgElement);
        answerWindow.appendChild(document.createElement("br"));
    }
    

  }

  const originalFetch = window.fetch;
  window.fetch = function () {
    return originalFetch.apply(this, arguments).then(async (res) => {
      if (res.url.includes("/getAssessmentItem")) {
        const clone = res.clone();
        const json = await clone.json();

        let item, question;

        try {
          item = json.data.assessmentItem.item.itemData;

          console.log(item);

          question = JSON.parse(item).question;
        } catch {
          const errorIteration = localStorage.getItem("error_iter") || 0;
          localStorage.setItem("error_iter", +errorIteration + 1);

          if (errorIteration < 4) {
            return location.reload();
          } else {
            return console.log(
              "%c An error occurred",
              "color: red; font-weight: bolder; font-size: 20px;"
            );
          }
        }

        if (!question) return;

        Object.keys(question.widgets).map((widgetName) => {
          console.log("name", widgetName);
          switch (widgetName.split(" ")[0]) {
            case "numeric-input":
              return freeResponseAnswerFrom(question).log();
            case "input-number":
              return freeResponseAnswerFrom(question).log();
            case "radio":
              return multipleChoiceAnswerFrom(question).log();
            case "expression":
              return expressionAnswerFrom(question).log();
            case "dropdown":
              return dropdownAnswerFrom(question).log();
          }
        });
      }

      if (!window.loaded) {
        console.clear();
        console.log(
          "%c Answer Revealer ",
          "color: mediumvioletred; font-size:40px; font-weight:bolder;"
        );
        console.log(
          "%cCreated by Artur Szczurowski (@Arturex0)",
          "color: white; font-size:15px;"
        );
        window.loaded = true;
      }

      return res;
    });
  };

  function freeResponseAnswerFrom(question) {
    const answer = Object.values(question.widgets)
      .map((widget) => {
        if (widget.options?.answers) {
          return widget.options.answers.map((ans) =>
            ans.status === "correct" ? ans.value : null
          );
        } else if (widget.options?.inexact === false) {
          return widget.options.value;
        }
      })
      .flat()
      .filter((val) => val !== null);

    return new Answer(answer, "free_response");
  }

  // Define the answerArray globally (or you can define it inside the function depending on your scope)
var answerArray = [];

// Modify the function to add entries to the answerArray
function multipleChoiceAnswerFrom(question) {
  // Process the question and get the answers with indexes
  const answer = Object.values(question.widgets)
    .map((widget) => {
      if (widget.options?.choices) {
        return widget.options.choices
          .map((choice, index) =>
            choice.correct ? { content: choice.content, index: index } : null
          )
          .filter((val) => val !== null); // Filter out incorrect choices
      }
    })
    .flat()
    .filter((val) => val !== null);

  // Log each answer content with its index
  answer.forEach((ans) => {
    console.log(`Answer: ${ans.content}, Index: ${ans.index}`);
  });

  // Automatically select the correct answer based on the index
  answer.forEach((ans) => {
    const answerIndex = ans.index;

    // Select all radio list items
    const radioOptions = document.querySelectorAll("ul.perseus-widget-radio li");

    // Check if the index exists in the list and simulate a click
    if (radioOptions[answerIndex]) {
      radioOptions[answerIndex].click();
      console.log(`Clicked on the answer at index: ${answerIndex}`);
    } else {
      console.warn(`No radio option found at index: ${answerIndex}`);
    }
  });

  // Add the answer data to the global answerArray
  answerArray.push({
    type: "multiple-choice",
    answerIndexes: answer.map((ans) => ans.index), // Collect all the correct indexes
  });

  console.log("Current answerArray: ", answerArray);

  return new Answer(answer.map((ans) => ans.content), "multiple_choice");
}

  
  

  function expressionAnswerFrom(question) {
    const answer = Object.values(question.widgets)
      .map((widget) => {
        if (widget.options?.answerForms) {
          return widget.options.answerForms.map((ans) =>
            ans.correct ? ans.value : null
          );
        }
      })
      .flat()
      .filter((val) => val !== null);

    return new Answer(answer, "expression");
  }

  function dropdownAnswerFrom(question) {
    const answer = Object.values(question.widgets)
      .map((widget) => {
        if (widget.options?.choices) {
          return widget.options.choices.map((choice) =>
            choice.correct ? choice.content : null
          );
        }
      })
      .flat()
      .filter((val) => val !== null);

    return new Answer(answer, "dropdown");
  }


  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  var questionIndex = 0;

  // anwser array will include 
  
  async function detectLetsGoButton() {

    await sleep(2000); // Small delay to ensure the button has loaded

    console.log("WINDOW LOAD");
    // Use a selector that matches the button structure
    const letsGoButton = Array.from(document.querySelectorAll('button[type="button"]')).find((button) => {
      const span = button.querySelector('span');
      return span && span.textContent.trim() === "Let’s go";
    });
  
    if (letsGoButton) {
      console.log("Found 'Let’s go' button:", letsGoButton);
  
      // Click the button
      letsGoButton.click();
      questionIndex = 0;
      anwserQuestions();
    } else {
      console.warn("'Let’s go' button not found on this page.");
    }
  }
  
  const originalPushState = history.pushState;
  
  // Override the pushState and replaceState methods
  history.pushState = function(state, title, url) {
    originalPushState.call(history, state, title, url);
    console.log('URL changed via pushState:', window.location.href);
    detectLetsGoButton();
  };



  

  async function anwserQuestions() {
    let questionIndex = 0;
  
    // Continue running until all answers are processed
    while (questionIndex < answerArray.length) {
      await sleep(2000); // Small delay to ensure the button has loaded
  
      // Log the current answer indexes for the question
      console.log(answerArray[questionIndex].answerIndexes);
  
      // Iterate over each answer index in the current question's answerIndexes
      answerArray[questionIndex].answerIndexes.forEach(index => {
        // Select all radio list items for the current question
        const radioOptions = document.querySelectorAll("ul.perseus-widget-radio li");
  
        console.log("radio-length", radioOptions.length);
        console.log("radio", radioOptions);
  
        // Check if the radio option exists for the given index
        if (radioOptions[index]) {
          // Find the button inside the selected radio option
          const button = radioOptions[index].querySelector("button[type='button']");
          
          // If the button exists, click it
          if (button) {
            button.click();
            console.log(`Clicked on answer at index: ${index}`);
          } else {
            console.warn(`Button not found inside radio option at index: ${index}`);
          }
        } else {
          console.warn(`No radio option found at index: ${index}`);
        }
      });
  
      // Move to the next question in the answerArray
      questionIndex++;
      break;
  
      // Optional: Add a delay before proceeding to the next question (if necessary)
      // await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
    }
  }
  

  
})();
