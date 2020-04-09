//object
let CarolDetails = {
  name: "Carol Martines",
  country: "Italy"
};

//fucntion with a parameter called personDetails
function printName(personDetails) {
  console.log(
    `my name is ${personDetails.name}. I'm from ${personDetails.country}`
  );
}

console.log(printName(CarolDetails));

function welcome(name) {
  if (name === "Carol Martines") {
    console.log("Welcome to kingara close");
  } else {
    console.log("you are not welcome here");
  }
}
console.log(welcome(CarolDetails.name));

// questa è una promessa
let dinnerDate = reply => {
  return new Promise((resolve, reject) => {
    if (reply === "yes") {
      resolve("let's go for a date");
    } else {
      reject("I'm too busy today bye");
    }
  });
};

async function resolvedDinner() {
  try {
    let reply = await dinnerDate("no");
    console.log(reply);
  } catch (error) {
    console.log(error);
  }
}
resolvedDinner();

// pure function, una funzione che ha il valore di ritorno

let buddies = ["makena", "elsa", "magda"]; //array
function checkBuddies(name) {
  for (let i = 0; i < buddies.length; i++) {
    if (name === buddies[i]) {
    continue 
    }
    else {
        return `${name} you are not recognized as a buddy`
    }
  }
}
console.log (checkBuddies("elon"))
