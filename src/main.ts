import { Args, ParseError } from "grimoire-kolmafia";
import {
  Item,
  availableAmount,
  cliExecute,
  equip,
  myFamiliar,
  outfit,
  print,
  toInt,
  toItem,
  useFamiliar,
  visitUrl,
} from "kolmafia";
import { $familiar, $item, $skill } from "libram";

const DEFAULT_FAM_ID = 1 + toInt($familiar`Pixel Rock`);
const DEFAULT_ITEM_ID = 1 + toInt($item`cursed monkey glove`);
const DEFAULT_SKILL_ID = 1 + toInt($skill`Psychogeologist`);

type targetInfo = [string, number];
const parseConfig = (target: string): targetInfo | ParseError => {
  const opt = target.split(",");
  if (!["fam", "item", "skill"].includes(opt[0])) return new ParseError(`Unknown target ${opt[0]}`);
  if (opt[1] && Number.isNaN(parseInt(opt[1]))) return new ParseError(`Unknown start id ${opt[1]}`);
  const defaults = new Map([
    ["fam", DEFAULT_FAM_ID],
    ["item", DEFAULT_ITEM_ID],
    ["skill", DEFAULT_SKILL_ID],
  ]);
  return [opt[0], opt[1] ? parseInt(opt[1]) : defaults.get(opt[0])!];
};

const config = Args.create("datamine", "Mine KoL for new stuff", {
  target: Args.custom(
    {
      help: "What type of ID should be checked? 'fam,id' | 'item,id' | 'skill,id' e.g. target=skill or target=fam,303",
      default: ["item", DEFAULT_ITEM_ID] as targetInfo,
    },
    parseConfig,
    "Search Type"
  ),
  range: Args.number({ help: "How many IDs should be checked?", setting: "", default: 3 }),
});

function datamineFamiliars() {
  for (let id = config.target[1]; id < config.target[1] + config.range; id++) {
    const found = !visitUrl("desc_familiar.php?which=" + id).includes("No familiar was found.");
    if (found) print("Found familiar: " + id);
    else print("No familiar id: " + id);
  }
}

function datamineItems() {
  cliExecute("checkpoint");
  const lastFam = myFamiliar();

  useFamiliar($familiar`Ghost of Crimbo Commerce`);
  equip($item`high-temperature mining drill`);

  const known = new Map<number, Item>(Item.all().map((i) => [toInt(i), i]));

  for (let id = config.target[1]; id < config.target[1] + config.range; id++) {
    if (known.has(id)) {
      print(`${id} is already known as ${known.get(id)}`);
      continue;
    }
    if (availableAmount(toItem(id)) > 0) {
      print(`${id} is already owned`);
      continue;
    }

    const found = visitUrl(`inv_equip.php?pwd=&which=2&action=equip&whichitem=${id}`);
    if (found.includes("Nopers.")) {
      print(`Did not find item id: ${id}`);
      continue;
    }

    const flea = visitUrl(`town_sellflea.php?pwd&whichitem=${id}&sellprice=100000&selling=Yep.`);
    const tradeable = !flea.includes("That item cannot be sold or transferred.");
    visitUrl(`town_sellflea.php?action=remove&whichitem=${id}&whichprice=100000&pwd=`);

    const type = found.includes("Ghosts can't wear equipment, it would just fall through.")
      ? "fam equip"
      : found.includes("You can't equip an off-hand item while wielding a 2-handed weapon.")
      ? "offhand"
      : visitUrl(`inv_eat.php?pwd&whichitem=${id}`).includes(
          "You don't have the item you're trying to use"
        )
      ? "food"
      : visitUrl(`inv_booze.php?pwd&whichitem=${id}`).includes(
          "You don't have the item you're trying to use"
        )
      ? "booze"
      : "thing";

    print(`Found ${tradeable ? "tradeable" : "untradeable"} ${type} ${id}`);
  }

  useFamiliar(lastFam);
  outfit("checkpoint");
}

function datamineSkills() {
  // const skills = $skills`Psychogeologist, Blood Frenzy, Blood Bond, Blood Bucatini, Blood Bubble, Blood Blade, Bram's Bloody Bagatelle`;
  testSkillsAfter();
}

function testSkillsAfter() {
  for (let id = config.target[1]; id < config.target[1] + config.range; id++) {
    const found = !visitUrl("desc_skill.php?whichskill=" + id).includes("No skill found.");
    if (found) print("Found skill: " + id);
    else print("No skill id: " + id);
  }
}

export default function main(command = ""): void {
  Args.fill(config, command);
  if (config.help) {
    Args.showHelp(config);
    return;
  }

  switch (config.target[0]) {
    case "item":
      datamineItems();
      break;
    case "fam":
      datamineFamiliars();
      break;
    case "skill":
      datamineSkills();
      break;
  }
}
