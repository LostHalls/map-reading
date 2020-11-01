class NamedStorage {
    constructor(name, json = true) {
        this.name = name || "";
        this.json = !!json;
        return new Proxy(this, {
            set: (obj, prop, value) => {
                if (this.hasOwnProperty(prop))
                    this[prop] = value;
                else
                    localStorage.setItem(`${this.name}${this.name?'-':''}${prop}`, this.json ? JSON.stringify(value) : value);
            },
            get: (obj, prop) => {
                if (this.hasOwnProperty(prop))
                    return this[prop];

                var val = localStorage.getItem(`${this.name}${this.name?'-':''}${prop}`);

                return this.json ? JSON.parse(val) : val;
            },
            deleteProperty: (obj, prop) => {
                if (!this.hasOwnProperty(prop))
                    localStorage.removeItem(`${this.name}${this.name?'-':''}${prop}`);
            }
        })
    }
}