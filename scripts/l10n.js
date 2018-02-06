/**
 * Translates a HTMl page in the web l10n style from the Add-on SDK with
 * WebExtensions strings.
 * Large parts of the logic are very similar to the SDK implmentation.
 * All you have to do to use this in a document is load it.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

function translateElementAttributes(element) {
    const attrList = [
        'title',
        'accesskey',
        'alt',
        'label',
        'placeholder',
        'abbr',
        'content',
        'download',
        'srcdoc',
        'value'
    ];
    const ariaAttrMap = {
        'aria-label': 'ariaLabel',
        'aria-value-text': 'ariaValueText',
        'aria-moz-hint': 'ariaMozHint'
    };
    const attrSeparator = '_';

    const presentAttributes = element.dataset.l10nAttrs.split(",");

    // Translate allowed attributes.
    for(const attribute of presentAttributes) {
        let data;
        if(attrList.includes(attribute)) {
            data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
        }
        // Translate ARIA attributes
        else if(attribute in ariaAttrMap) {
            data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + ariaAttrMap[attribute]);
        }

        if(data && data != "??") {
            element.setAttribute(attribute, data);
        }
    }
}

function translateElement(element = document) {
    //TODO follow the tranlsate attribute's instructions (yes/no/inherit)
    // Get all children that are marked as being translateable.
    const children = element.querySelectorAll('*[data-l10n-id]');
    for(const child of children) {
        if(!child.dataset.l10nNocontent) {
            const data = browser.i18n.getMessage(child.dataset.l10nId);
            if(data && data != "??") {
                child.textContent = data;
            }
        }
        if(child.dataset.l10nAttrs) {
            translateElementAttributes(child);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => translateElement(), {
    capture: false,
    passive: true,
    once: true
});
