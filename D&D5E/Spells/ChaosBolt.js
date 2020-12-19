class ChaosBolt{

  constructor({item = null, token = null, actor = null, targets = null, event = null} = {}){

    this.token = token;
    this.event = event;
    this.targets = targets === null ? Array.from(game.user.targets) : [];
    actor = token !== null ? token.actor : actor;

    if(!item && !actor){
      console.error("You need to provide at least an item or an actor!")
      return;
    }

    if(!item){
      
      item = actor.items.find(i => i.name.toLowerCase() === "chaos bolt");

      if(!item){
        console.error("This actor does not have the chaos bolt spell")
        return;
      }

    }

    if(item.name.toLowerCase() != "chaos bolt"){
      console.error("This is not the chaos bolt spell!")
      return;
    }

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

    this.useSpell();
  }

  async useSpell() {

    let roll = await this.item.roll({createWorkflow: false});

    this.slot_level = roll.data.content.charAt(roll.data.content.indexOf("data-spell-level")+18);

    this.attackRoll();
    
  }

  async attackRoll(){

    let attack_roll = await this.item.rollAttack({event: this.event});

    this.damageRoll(attack_roll.results[0]);

  }

  damage_dialog(damage_roll){

    let [first, second] = damage_roll.terms[0].results;

    let content = `
    <form>
    <p>You rolled a total of <strong>${damage_roll.total}</strong> damage! Select what type of damage you want to deal:</p>
    <select style='width:100%; margin-bottom: 10px;' for="type">
    <option>${this.table[first.result-1]}</option>
    <option>${this.table[second.result-1]}</option>
    </select>
    </form>
    `;

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
          resolve(html.find('select').val().toLowerCase());
        },
        default: "Cancel"
      }).render(true);

    })

  }

  async damageRoll(attack_roll){

    if(attack_roll == 1){
      return;
    }

    let crit = attack_roll == 20;

    let damage_roll = new Roll(`${(crit ? 4 : 2)}d8+${this.slot_level*(crit ? 2 : 1)}d6`).roll();

    if(damage_roll){

      let [first, second] = damage_roll.terms[0].results;

      if(this.targets.length > 0 && game.modules.get("midi-qol").active){

        let damage_type = ""

        if(first.result == second.result){

          damage_type = this.table[first.result-1].toLowerCase();

        }else{

          damage_type = await this.damage_dialog(damage_roll);

        }

        new MidiQOL.DamageOnlyWorkflow(this.actor, this.token, damage_roll.total, damage_type, this.targets, damage_roll, {flavor: `Chaos Bolt (${damage_type})`, itemCardId: this.item._id})       

        if(first.result == second.result){
          this.attackRoll();
        }

      }else{

        let speaker = this.actor;
        if(first.result == second.result){
          damage_roll.toMessage({flavor: `BOOM! The chaos bolt deals <strong>${this.table[first.result-1]}</strong> and bounces! You can roll again!`, speaker});
          this.attackRoll();
        }else{
          damage_roll.toMessage({flavor: `The chaos bolt deals <strong>${this.table[first.result-1]}</strong> or <strong>${this.table[second.result-1]}</strong>!`, speaker});
        }
      }

    }

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

new ChaosBolt({actor: cb_actor, token: cb_token, item: cb_item, event: cb_event});