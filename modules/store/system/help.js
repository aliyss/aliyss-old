const merge = require('deepmerge');
const treeify = require('treeify');
const flatten = require("flat");

/*Local Functions*/
//Run File
function runFile(file, content, message, client) {

	let commandFile = require(file);
	return commandFile.run(content, message, client);

}

function helpFile(file) {

	try {
		let commandFile = require(file);
		return commandFile.help;
	} catch (e) {
		console.log(e)
	}

}

function embedder() {
	return {
		title: "Help",
		description: null,
		color: 6392832,
		footer: null
	}
}

function recHelpObj(obj, arr, args) {
	if (args.length > 0) {
		if (arr.includes(args[0])) {
			args.shift();
			arr.shift();
			obj[arr[0].replace(".js", "")] = recHelpObj({}, arr, args);
		} else if (args.length === 1 && arr.includes(args[0] + ".js")) {
			args.shift();
			arr.shift();
			obj[arr[0].replace(".js", "")] = recHelpObj({}, arr, args);
		}
		return obj
	} else if (arr.length > 1) {
		arr.shift();
		obj[arr[0].replace(".js", "")] = recHelpObj({}, arr, []);
		return obj
	} else {
		return null
	}
}

exports.help = {
	arguments: [],
	optional: ["{module}", "{command}"],
	information: Object.keys({})
};

exports.run = async (options, message, args, client) => {

	let help_obj = {};
	let match = args.additional.length;
	let file;

	for (let i = 0; i < args.additional.length ; i++) {
		let file_x = args.additional[i];
		args.additional[i] = args.additional[i].replace("./store", "").replace(`/_types/${options.type}`, "");
		let add_arr = args.additional[i].split("/");
		let arg_arr = args.args.slice();
		let combine_help = recHelpObj({}, add_arr, arg_arr);
		let merged = merge(combine_help, help_obj);
		if (!(JSON.stringify(help_obj).length >= JSON.stringify(merged).length)) {
			file = file_x;
			help_obj = merged;
			match = (JSON.stringify(help_obj).match(/null/g) || []).length;
			//match = (JSON.stringify(help_obj).match(/null/g) || []).length;
		}
	}

	let tree = treeify.asTree(help_obj, true);

	let content = "```css\n" + tree + "```";
	let embed = embedder();

	if (tree === "") {
		content = "``⛔ Error: No commands found.``"
	}

	if (match > 1 || file === undefined) {
		embed = merge(embed, {
			title: embed.title + " - Command Paths",
			fields: [
				{
					name: "".padEnd(54, `~`).replace(/~/g, "⠀"),
					value: content
				}
			]
		})
	} else {
		let info = helpFile(file.replace(".", options.main_directory + options.locations.modules));
		let nec_args = "``No Necessary Arguments needed.``";
		let opt_args = "``No Optional Arguments needed.``";
		let spec_args = "``No Specification Arguments needed.``";

		let diff = [];
		for (let i = 0; i < 3; i++) {
			diff.push(`> \`\`${client._profile.prefixes[0].trim()} ${file.replace("./store", "").replace(`/_types/${options.type}`, "").replace(".js", "").split("/").join(" ")} `);
		}

		if (info.information && info.information.length > 0) {
			spec_args = "``∙ " + info.information.join("\n∙ ") + "``";
			for (let i = 0; i < diff.length; i++) {
				if (i !== 0)  {
					if (info.information[i]) {
						diff[i] += `${info.information[i]}`
					} else {
						diff[i] += `${info.information[0]}`
					}
				}
			}
		}
		if (info.arguments && info.arguments.length > 0) {
			nec_args = "``∙ " + info.arguments.join("``\n``∙ ").replace(/\[/g, "").replace(/]/g, "") + "``";
			for (let i = 0; i < diff.length; i++) {
				diff[i] += ` ${info.arguments.join(" ")}`
			}
		}
		if (info.optional && info.optional.length > 0) {
			opt_args = "``∙ " + info.optional.join("``\n``∙ ").replace(/{/g, "").replace(/}/g, "") + "``";
			for (let i = 0; i < diff.length; i++) {
				if (info.optional[i]) {
					diff[i] += ` ${info.optional[i]}`
				} else {
					diff[i] += ` ${info.optional[0]}`
				}
			}
		}

		embed = merge(embed, {
			title: embed.title + " - " + info.name,
			description: info.description,
			fields: [
				{
					name: "_\n_**Command Path**".padEnd(63, `~`).replace(/~/g, "⠀"),
					value: content
				},
				{
					name: "_\n_**Necessary Arguments**" + ` (\`\`${info.arguments.length}\`\`)`,
					value: nec_args,
					inline: true
				},
				{
					name: "_\n_**Optional Arguments**" + ` (\`\`${info.optional.length}\`\`)`,
					value: opt_args,
					inline: true
				},
				{
					name: "_\n_**Spefications**" + ` (\`\`${info.information.length}\`\`)`,
					value: spec_args,
					inline: true
				},
				{
					name: "_\n_**Usage Examples**".padEnd(63, `~`).replace(/~/g, "⠀"),
					value: [...new Set(diff)].join("``\n") + "``"
				},
			]
		})
	}

	await runFile(options._return + "send.js", {embed: embed}, message, client)
};