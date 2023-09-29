function assert(expr, message) {
    if(!Boolean(expr)) {
      throw new Error(message || 'unknown assertion error');
    }
}

const build_template = (html) => {
    const dummy = document.createElement('template');
    dummy.innerHTML = html;
    return dummy;
}

class Point {
    #x;
    #y;
    /**
     * 
     * @param {number | Point} x 
     * @param {number?} y
     */
    constructor(x, y) {
        if (x.x)
            ({x, y} = x);
        this.#x = +x || 0;
        this.#y = +y || 0;
    }

    get x() { return this.#x; }
    get y() { return this.#y; }

    /**
     * 
     * @param {number | Point} x 
     * @param {number?} y
     */
    add(x, y) {
        if (x.x)
            ({x, y} = x);
        return new Point(this.x + x, this.y + y);
    }
}

/**
 * @param {{topLeft: Point, topRight: Point, bottomLeft: Point, bottomRight: Point}} rect 
 * @param {Point} pivot 
 * @param {number} angle 
 */
class SettingChangedEvent extends Event {
    #settingName;
    #oldValue;
    #newValue;
    constructor(settingName, oldValue, newValue) {
        super('settingChanged');
        this.#settingName = settingName;
        this.#oldValue = oldValue;
        this.#newValue = newValue;
    }

    get setting() { return this.#settingName }
    get value() { return this.#newValue }
    get old() { return this.#oldValue }
}

class Settings extends EventTarget {
    #settings = {};
    /**
     * 
     * @param  {...SettingsUIItem} options 
     */
    constructor(...options) {
        super();

        let old = JSON.parse(localStorage.getItem("settings")) || {};
        let changed = false;
        options.forEach(option => {
            if (!(option.displayName in old)) {
                changed = true;
                this.#settings[option.displayName] = {...option};
                this.#settings[option.displayName].currentValue = option.defaultValue;
            } else {
                this.#settings[option.displayName] = {...old[option.displayName]};
            }
        });

        if (changed) this.save();
        this.dispatchEvent(new Event('initialized'));
    }

    save() {
        localStorage.setItem("settings", JSON.stringify(this.#settings));
    }

    get(prop) {
        return this.#settings[prop].currentValue;
    }

    /**
     * Attempts to set value to the setting property. If the property name has not
     * been initialized, this will do nothing and return false.
     * 
     * Note: value type must match the type for the property or the method will fail.
     * @param {string} prop 
     * @param {SettingType} value 
     * 
     * @fires settingChanged when the operation was successful.
     * 
     * @returns {boolean} True if prop was successfully changed, false otherwise.
     */
    set(prop, value) {
        if (!(prop in this.#settings)) return false;
        if (typeof(value) !== this.#settings[prop].type) return false;        
        if (this.#settings[prop].currentValue === value) return true;

        const oldValue = this.#settings[prop].currentValue;
        this.#settings[prop].currentValue = value;
        this.save();

        this.dispatchEvent(new SettingChangedEvent(prop, oldValue, value));
        
        return true;
    }

    /**
     * Register 
     * @param {SettingsUIItem} item 
     * @param {boolean} [force=false]
     * @returns 
     */
    register(item, force) {
        if (item.displayName in this.#settings && !force) 
            return this.#settings[item.displayName].currentValue;
        this.#settings[item.displayName] = {...item};
        if (!this.#settings[item.displayName].type)
            this.#settings[item.displayName].type == typeof(this.#settings[item.displayName].defaultValue);
        this.#settings[item.displayName].currentValue = item.defaultValue;
        this.save();
        return item.defaultValue;
    }

    entries() {
        return Object.entries(this.#settings).map(entry => ({ key: entry[0], value: entry[1].currentValue, type: entry[1].type }));
    }

    [Symbol.iterator]() {
        return this.entries()[Symbol.iterator]();
    }
}

class SettingsUI extends HTMLElement {
    /**
     * @type {Settings?}
     */
    #settings;
    #settingsMap = {};

    /**
     * @type {ShadowRoot}
     */
    #shadow;

    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: "open" });
        this.#buildUI();
    }
    
    /**
     * 
     * @param {Settings} settings 
     */
    registerSettings(settings) {
        if (this.#settings) {
            this.#settings.removeEventListener('initialized', this.#settingsInitialized);
            this.#settings.removeEventListener('settingChanged', this.#settingChanged);
        }
        this.#settings = settings;
        this.#settings.addEventListener('initialized', this.#settingsInitialized);
        this.#settings.addEventListener('settingChanged', this.#settingChanged);
        this.#buildUI();
    }

    #buildUI() {
        this.#shadow.innerHTML = "<h2>Settings</h2>";
    }

    #settingsInitialized() {
        this.#buildUI();
    }

    #settingChanged(event) {
        this.#updateSetting(event.setting);
    }

    #updateSetting(settingName) {

    }

    attributeChangedCallback() {
        
    }

}

customElements.define(`h-settings`, SettingsUI);


