class ChaosBolt{

	constructor({item = null, token = null, actor = null, target = null, event = null, show_post_cast = true} = {}){

		this.token = token;
		this.event = event;
		this.first_target = target;
		actor = token !== null ? token.actor : actor;
		this.show_post_cast = show_post_cast;

		if(!item && !actor){
			return ui.notifications.warn("You need to provide at least an item or an actor!");
		}

		if(!item){
			
			item = actor.items.find(i => i.name.toLowerCase() === "chaos bolt");

			if(!item){
				return ui.notifications.warn("This actor does not have the chaos bolt spell");
			}

		}

		if(item.name.toLowerCase() != "chaos bolt"){
			return ui.notifications.warn("This is not the chaos bolt spell!");
		}

		this.speaker = ChatMessage.getSpeaker({token: this.actor});

		this.item = item;
		this.slot_level = 1;

		this.table = [
			"Acid",
			"Cold",
			"Fire",
			"Force",
			"Lightning",
			"Poison",
			"Psychic",
			"Thunder"
		];

		this.total_damage = 0;
		this.types_of_damage = {};

		this.useSpell();
	}

	async useSpell() {

		let roll = await this.item.roll({createWorkflow: false});

		if(!roll) return;

		this.slot_level = roll.data.content.charAt(roll.data.content.indexOf("data-spell-level")+18);

		this.attackRoll();
		
	}

	async attackRoll(){

		let attack_roll = await this.item.rollAttack({event: this.event});

		this.target = this.first_target === null ? (Array.from(game.user.targets).length > 0 ? [Array.from(game.user.targets)[0]] : []) : (Array.isArray(this.first_target) ? [this.first_target[0]] : this.first_target);

		if(!attack_roll){
			this.post_cast();
			return;
		}

		this.damageRoll(attack_roll.results[0]);

	}

	async damageRoll(attack_roll){

		if(attack_roll == 1){
			return;
		}

		let crit = attack_roll == 20;

		let damage_roll = new Roll(`${(crit ? 4 : 2)}d8+${this.slot_level*(crit ? 2 : 1)}d6`).roll();

		if(damage_roll){

			let [first, second] = damage_roll.terms[0].results;

			let damage_type = ""

			if(first.result == second.result){

				damage_type = this.table[first.result-1];

			}else{

				damage_type = await this.damage_dialog(damage_roll);

			}

			this.types_of_damage[damage_type] = this.types_of_damage[damage_type] === undefined ? damage_roll.total : this.types_of_damage[damage_type] + damage_roll.total;
			this.total_damage += damage_roll.total;

			if(this.target.length > 0 && game.modules.get("midi-qol").active){

				new MidiQOL.DamageOnlyWorkflow(this.actor, this.token, damage_roll.total, damage_type.toLowerCase(), this.target, damage_roll, {flavor: `Chaos Bolt (${damage_type.toLowerCase()})`, itemCardId: this.item._id, speaker: this.speaker})

				if(first.result == second.result){
					game.user.updateTokenTargets();
					this.first_target = null;
					this.attackRoll();
				}else{
					this.post_cast();
				}

			}else{

				if(first.result == second.result){
					damage_roll.toMessage({flavor: `BOOM! The chaos bolt deals <strong>${this.table[first.result-1].toLowerCase()}</strong> and bounces! You can roll again!`, speaker: this.speaker});
					this.attackRoll();
				}else{
					damage_roll.toMessage({flavor: `The chaos bolt deals <strong>${damage_type.toLowerCase()}</strong> damage!`, speaker: this.speaker});
					this.post_cast();
				}
			}

		}

	}

	damage_dialog(damage_roll){

		let [first, second] = damage_roll.terms[0].results;

		let content = `
		<form>
			<p>You rolled a total of <strong>${damage_roll.total}</strong> damage! Select what type of damage you want to deal:</p>

			<div class="flexrow" style="margin:0.5rem 0;">
				<div>
					<input type="radio" id="first" name="damage_type" checked value="${this.table[first.result-1]}">
					<label for="first">${this.table[first.result-1]}</label>
				</div>
				<div>
					<input type="radio" id="second" name="damage_type" value="${this.table[second.result-1]}">
					<label for="second">${this.table[second.result-1]}</label>
				</div>
			</div>

		</form>`;

		return new Promise((resolve, reject) => {

			new Dialog({
				title: "Chaos Bolt - Select type of damage",
				content: content,
				buttons: {
					one: {
						icon: `<i class="fas fa-check"></i>`,
						label: "Done"
					}
				},
				close: function(html){
					resolve(html.find('input[name="damage_type"]:checked').val());
				},
				default: "Cancel"
			}).render(true);

		})

	}

	post_cast(){

		if(Object.keys(this.types_of_damage).length <= 1 || !this.show_post_cast) return;

		let content = `<p>You dealt a total of:</p>`;
		content += `<ol style="list-style-type: circle;">`
		for(let [damage_type, damage] of Object.entries(this.types_of_damage)){
			content += `<li>${damage} ${damage_type}</li>`;
		}
		content += `</ol>`
		content += `<p>For a total of <strong>${this.total_damage}</strong> damage!</p>`

		ChatMessage.create({
			user: game.user._id,
			speaker: this.speaker,
			content: content
		});

	}

}

let cb_item = null;
try{ cb_item = item; }catch(err){ cb_item = null; }

let cb_token = null;
try{ cb_token = token; }catch(err){ cb_token = null; }

let cb_event = null;
try{ cb_event = event; }catch(err){ cb_event = null; }

let cb_actor = null;
try{ cb_actor = actor; }catch(err){ cb_actor = null; }

let show_post_cast = true;

new ChaosBolt({actor: cb_actor, token: cb_token, item: cb_item, event: cb_event, show_post_cast: show_post_cast});
