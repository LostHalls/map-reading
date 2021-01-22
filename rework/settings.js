class Setting extends EventTarger {
    constructor(group, type, key, name, value) {
        this.group = group;
        this.type = type;
        this.key = key;
        this.name = name;
        this.value = value;

        return new Proxy(this, {
            set: (obj, prop, value) => {
                if (obj[prop] === value)
                    return true;

                this.dispatchEvent(new Event(prop));

                obj[prop] = value;
                return true;
            }
        })
    }
}

class SettingsManager extends EventTarget {
    constructor() {
        this.keys = [];
        this.load();
        this.update();

        return new Proxy(this, {
            get: (obj, prop) => {
                if (this.hasOwnProperty(prop))
                    return this[prop];
                
                return this.keys.find(k => k.key === prop);
            },
            set: (obj, prop, value) => {
                if (this.hasOwnProperty(prop))
                    this[prop] = value;
                
                if (!this.keys[prop]) {
                    
                }
                this.keys[prop] = value;
            }
        });
    }

    load() {

    }

    update() {

    }
}

SettingsManager.defaults = {
    version: '2.0'
}