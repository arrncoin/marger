// scripts/build-react-icons.js
// Compiles selected icons from react-icons into a lightweight, standalone client bundle
const fs = require("fs");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

// Icon packages from react-icons
const fa = require("react-icons/fa");
const fa6 = require("react-icons/fa6");
const gi = require("react-icons/gi");
const si = require("react-icons/si");
const bs = require("react-icons/bs");

const iconCatalog = [
  // Core navigation & dashboard
  { name: "FaReact", src: fa.FaReact },
  { name: "SiReact", src: si.SiReact },
  { name: "React", src: fa.FaReact },
  { name: "FaChartBar", src: fa.FaChartBar },
  { name: "FaComments", src: fa.FaComments },
  { name: "FaTv", src: fa.FaTv },
  { name: "FaGamepad", src: fa.FaGamepad },
  { name: "FaTrophy", src: fa.FaTrophy },
  { name: "FaVolumeUp", src: fa.FaVolumeUp },
  { name: "FaVolumeMute", src: fa.FaVolumeMute },
  { name: "FaCog", src: fa.FaCog },
  { name: "FaKey", src: fa.FaKey },
  { name: "FaBars", src: fa.FaBars },
  { name: "FaBolt", src: fa.FaBolt },
  { name: "FaPlay", src: fa.FaPlay },
  { name: "FaStop", src: fa.FaStop },
  { name: "FaSyncAlt", src: fa.FaSyncAlt },
  { name: "FaRobot", src: fa.FaRobot },
  { name: "FaUsers", src: fa.FaUsers },
  { name: "FaUser", src: fa.FaUser },
  { name: "FaClock", src: fa.FaClock },
  { name: "FaStopwatch", src: fa.FaStopwatch },
  { name: "FaFlagCheckered", src: fa.FaFlagCheckered },
  { name: "GiMaze", src: gi.GiMaze },
  { name: "FaCompass", src: fa.FaCompass },
  { name: "FaDungeon", src: fa.FaDungeon },
  
  // Directions & Movement
  { name: "FaArrowUp", src: fa.FaArrowUp },
  { name: "FaArrowDown", src: fa.FaArrowDown },
  { name: "FaArrowLeft", src: fa.FaArrowLeft },
  { name: "FaArrowRight", src: fa.FaArrowRight },
  { name: "FaShoePrints", src: fa.FaShoePrints },
  { name: "FaWalking", src: fa.FaWalking },
  
  // Economy & Points
  { name: "FaCoins", src: fa.FaCoins },
  
  // UI helpers
  { name: "FaEye", src: fa.FaEye },
  { name: "FaEyeSlash", src: fa.FaEyeSlash },
  { name: "FaCheck", src: fa.FaCheck },
  { name: "FaTimes", src: fa.FaTimes },
  { name: "FaCheckCircle", src: fa.FaCheckCircle },
  { name: "FaTimesCircle", src: fa.FaTimesCircle },
  { name: "FaMedal", src: fa.FaMedal },
  { name: "FaCrown", src: fa.FaCrown },
  { name: "FaLightbulb", src: fa.FaLightbulb },
  { name: "FaDice", src: fa.FaDice },
  { name: "FaTrash", src: fa.FaTrash },
  { name: "FaSave", src: fa.FaSave },
  { name: "FaBullseye", src: fa.FaBullseye },
  { name: "FaMicrophone", src: fa.FaMicrophone },
  { name: "FaSkull", src: fa.FaSkull },
  { name: "FaFire", src: fa.FaFire },
  { name: "FaBookOpen", src: fa.FaBookOpen },
  { name: "FaLink", src: fa.FaLink },
  { name: "FaExclamationTriangle", src: fa.FaExclamationTriangle },
  { name: "FaMagic", src: fa.FaMagic },
  { name: "FaBroadcastTower", src: fa.FaBroadcastTower },
  { name: "FaVoteYea", src: fa.FaVoteYea },
  { name: "FaPuzzlePiece", src: fa.FaPuzzlePiece },
  { name: "FaGift", src: fa.FaGift },
  { name: "FaHeart", src: fa.FaHeart },
  { name: "FaGem", src: fa.FaGem },
  { name: "FaStar", src: fa.FaStar },
  { name: "FaCopy", src: fa.FaCopy },
  { name: "FaSearch", src: fa.FaSearch },
  { name: "FaPaperPlane", src: fa.FaPaperPlane },
  { name: "FaExternalLinkAlt", src: fa.FaExternalLinkAlt },
  { name: "FaPlus", src: fa.FaPlus },
  { name: "FaMinus", src: fa.FaMinus },
  { name: "FaListOl", src: fa.FaListOl },
  { name: "FaListUl", src: fa.FaListUl },
  { name: "FaSlidersH", src: fa.FaSlidersH },
  { name: "FaWifi", src: fa.FaWifi },
  { name: "FaSignal", src: fa.FaSignal },
  { name: "FaFilter", src: fa.FaFilter },
  { name: "FaYoutube", src: fa.FaYoutube },
  { name: "SiTiktok", src: si.SiTiktok || fa6.FaTiktok },
  { name: "FaTiktok", src: fa6.FaTiktok || si.SiTiktok },
  { name: "FaInfoCircle", src: fa.FaInfoCircle },
  { name: "FaQuestionCircle", src: fa.FaQuestionCircle },
  { name: "FaShieldAlt", src: fa.FaShieldAlt },
  { name: "FaHourglassHalf", src: fa.FaHourglassHalf }
];

const svgMap = {};
for (const item of iconCatalog) {
  if (item.src) {
    // Render with standard class "react-icon" and inline-flex sizing
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(item.src, { className: "react-icon" })
    );
    svgMap[item.name] = markup;
  } else {
    console.warn("⚠️ Icon not found in react-icons:", item.name);
  }
}

// Generate the standalone client script content
const clientScriptContent = `// assets/react-icons.js
// Client-side React Icons Engine for Kak Jule Studio and OBS Overlays
(function (global) {
  "use strict";

  var ICONS = ${JSON.stringify(svgMap, null, 2)};

  var ReactIcons = {
    icons: ICONS,

    get: function (name, options) {
      options = options || {};
      var svg = ICONS[name];
      if (!svg) {
        // Fallback: check without prefix or case-insensitive
        var key = Object.keys(ICONS).find(function (k) {
          return k.toLowerCase() === name.toLowerCase() ||
                 k.toLowerCase() === ("fa" + name).toLowerCase() ||
                 k.toLowerCase() === ("gi" + name).toLowerCase();
        });
        if (key) svg = ICONS[key];
      }
      if (!svg) {
        console.warn("[ReactIcons] Icon not found:", name);
        return "";
      }

      // Add custom classes or inline styles if specified
      if (options.className) {
        svg = svg.replace('class="react-icon"', 'class="react-icon ' + options.className + '"');
      }
      if (options.color) {
        svg = svg.replace('<svg ', '<svg style="color:' + options.color + ';" ');
      }
      if (options.size) {
        var sizeStr = typeof options.size === "number" ? options.size + "px" : options.size;
        svg = svg.replace(/height="1em"/g, 'height="' + sizeStr + '"');
        svg = svg.replace(/width="1em"/g, 'width="' + sizeStr + '"');
      }
      if (options.style) {
        svg = svg.replace('<svg ', '<svg style="' + options.style + '" ');
      }
      return svg;
    },

    create: function (name, options) {
      var html = this.get(name, options);
      if (!html) return null;
      var template = document.createElement("template");
      template.innerHTML = html.trim();
      return template.content.firstChild;
    },

    renderAll: function (root) {
      root = root || document;
      
      // 1. Elements with data-react-icon attribute
      var elements = root.querySelectorAll("[data-react-icon]");
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var iconName = el.getAttribute("data-react-icon");
        if (iconName) {
          var className = el.getAttribute("data-icon-class") || "";
          var size = el.getAttribute("data-icon-size") || null;
          var color = el.getAttribute("data-icon-color") || null;
          var html = this.get(iconName, { className: className, size: size, color: color });
          if (html) {
            el.innerHTML = html;
          }
        }
      }

      // 2. Custom tags: <react-icon name="FaTrophy"></react-icon>
      var customTags = root.querySelectorAll("react-icon[name]");
      for (var j = 0; j < customTags.length; j++) {
        var tag = customTags[j];
        var nameAttr = tag.getAttribute("name");
        if (nameAttr && !tag.hasChildNodes()) {
          var cName = tag.getAttribute("class") || "";
          var s = tag.getAttribute("size") || null;
          var col = tag.getAttribute("color") || null;
          var rendered = this.get(nameAttr, { className: cName, size: s, color: col });
          if (rendered) {
            tag.innerHTML = rendered;
          }
        }
      }
    },

    autoObserve: function () {
      if (typeof MutationObserver === "undefined") return;
      var self = this;
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var mut = mutations[i];
          if (mut.addedNodes && mut.addedNodes.length > 0) {
            for (var j = 0; j < mut.addedNodes.length; j++) {
              var node = mut.addedNodes[j];
              if (node.nodeType === 1) { // ELEMENT_NODE
                if (node.hasAttribute("data-react-icon") || node.tagName.toLowerCase() === "react-icon") {
                  self.renderAll(node.parentElement || node);
                } else if (node.querySelectorAll) {
                  var targets = node.querySelectorAll("[data-react-icon], react-icon[name]");
                  if (targets.length > 0) {
                    self.renderAll(node);
                  }
                }
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  // Define custom element <react-icon>
  if (typeof customElements !== "undefined" && !customElements.get("react-icon")) {
    var ReactIconElement = function () {
      return Reflect.construct(HTMLElement, [], ReactIconElement);
    };
    Object.setPrototypeOf(ReactIconElement.prototype, HTMLElement.prototype);
    Object.setPrototypeOf(ReactIconElement, HTMLElement);

    ReactIconElement.prototype.connectedCallback = function () {
      var name = this.getAttribute("name");
      if (name && !this.querySelector("svg")) {
        var className = this.getAttribute("class") || "";
        var size = this.getAttribute("size") || null;
        var color = this.getAttribute("color") || null;
        var style = this.getAttribute("style") || null;
        var svgHtml = ReactIcons.get(name, { className: className, size: size, color: color, style: style });
        if (svgHtml) {
          this.innerHTML = svgHtml;
        }
      }
    };

    customElements.define("react-icon", ReactIconElement);
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        ReactIcons.renderAll();
        ReactIcons.autoObserve();
      });
    } else {
      ReactIcons.renderAll();
      ReactIcons.autoObserve();
    }
  }

  global.ReactIcons = ReactIcons;
})(typeof window !== "undefined" ? window : global);
`;

// Write to assets/react-icons.js and overlay/react-icons.js
fs.writeFileSync(path.resolve(__dirname, "../assets/react-icons.js"), clientScriptContent, "utf8");
fs.writeFileSync(path.resolve(__dirname, "../overlay/react-icons.js"), clientScriptContent, "utf8");

console.log("✅ assets/react-icons.js and overlay/react-icons.js successfully compiled with " + Object.keys(svgMap).length + " icons!");
