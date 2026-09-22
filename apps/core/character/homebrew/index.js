import { lib, game, ui, get, ai, _status } from "noname";
import characters from "./character.js";
import skills from "./skill.js";
import translates from "./translate.js";
import characterTitles from "./characterTitle.js";
import { applyAiShowGates } from "./aiShow.js";

applyAiShowGates(skills);

game.import("character", function () {
	return {
		name: "homebrew",
		connect: true,
		character: { ...characters },
		characterTitle: { ...characterTitles },
		skill: { ...skills },
		translate: { ...translates },
	};
});
