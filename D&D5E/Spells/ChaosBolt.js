class ChaosBolt{

  constructor({item = null, actor = null} = {}){

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

    let attack_roll = await this.item.rollAttack();

    if(attack_roll.results[0] != 1){
      this.damageRoll();
    }


  }

  async damageRoll(){

    let damage_roll = await this.item.rollDamage({spellLevel: this.slot_level});

    if(damage_roll){

      let [first, second] = damage_roll.terms[0].results;

      if(first.result == second.result){
        ChatMessage.create({
          content: `BOOM! The chaos bolt deals <strong>${this.table[first.result-1]}</strong> and bounces! You can roll again!`,
          speaker: ChatMessage.getSpeaker({ alias: "The Weave" })
        });
        this.attackRoll();
      }else{
        ChatMessage.create({
          content: `The chaos bolt deals <strong>${this.table[first.result-1]}</strong> or <strong>${this.table[second.result-1]}</strong>!`,
          speaker: ChatMessage.getSpeaker({ alias: "The Weave" })
        });
      }

    }

  }

}

// Depending on how you call it, you can use any of the following ways to trigger it:
// Through the Item Macro module by putting it into the spell
new ChaosBolt({item: item});

// On a macro with the token selected
new ChaosBolt({actor: token.actor});
