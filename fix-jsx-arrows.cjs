const fs = require("fs");

const path = "./apps/coach/src/App.jsx";
const backup = path + ".before-jsx-arrow-fix.bak";

fs.copyFileSync(path, backup);

let text = fs.readFileSync(path, "utf8");

const fixes = [
  ["Manage A/B groups >", 'Manage A/B groups {"→"}'],
  ["Click a drill from the library to add >", 'Click a drill from the library to add {"→"}'],
  ["Review Weekly Content >", 'Review Weekly Content {"→"}'],
  [">View all ></button>", '>View all {"→"}</button>'],
  [">Open engagement ></button>", '>Open engagement {"→"}</button>'],
  [">Open full ></button>", '>Open full {"→"}</button>']
];

for (const [oldText, newText] of fixes) {
  text = text.split(oldText).join(newText);
}

fs.writeFileSync(path, text, "utf8");

console.log("OK: JSX arrow warnings repaired");
