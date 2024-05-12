import { query, update, text, Record, StableBTreeMap, Variant, Vec, Ok, Err, nat } from "azle";
import { Ledger, binaryAddressFromAddress, binaryAddressFromPrincipal, hexAddressFromPrincipal } from "azle/canisters/ledger";
import { sha256 } from "js-sha256";

const Interaction = Record({
    id: text,
    date: text,
    interaction_type: text,
    description: text,
    status: text,
    comments: text,
});

const Purchase = Record({
    id: text,
    date: text,
    product: text,
    quantity: nat,
    price: nat,
});

const Customer = Record({
    id: text,
    name: text,
    company: text,
    email: text,
    phone: text,
    interactions: Vec(Interaction),
    purchases: Vec(Purchase),
});

const CustomerPayload = Record({
    name: text,
    company: text,
    email: text,
    phone: text,
});

const InteractionPayload = Record({
    date: text,
    interaction_type: text,
    description: text,
    status: text,
    comments: text,
});

const PurchasePayload = Record({
    date: text,
    product: text,
    quantity: nat,
    price: nat,
});

const Message = Variant({
    NotFound: text,
    InvalidPayload: text,
    InternalError: text,
});

const customerStorage = StableBTreeMap(0, text, Customer);
const interactionStorage = StableBTreeMap(1, text, Interaction);
const purchaseStorage = StableBTreeMap(2, text, Purchase);

export default Canister({

    /**
     * Retrieves all customers stored in the database
     */
    getCustomers: query([], Vec(Customer), () => {
        return customerStorage.values();
    }),

    /**
     * Retrieves a customer by ID
     * @param {string} id - The ID of the desired customer
     */
    getCustomer: query([text], Result(Customer, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const customerOpt = customerStorage.get(id);
        if (!customerOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Customer with id=${id} not found` });
        }
        return Ok(customerOpt.Some);
    }),

    /**
     * Creates a new customer and stores it in the database
     * @param {CustomerPayload} payload - The information needed to create a new customer
     */
    addCustomer: update([CustomerPayload], Result(Customer, Message), (payload) => {
        if (!isValidPayload(payload)) {
            return Err({ InvalidPayload: "Invalid payload" });
        }
        const customer = { id: generateUUID(), ...payload, interactions: [], purchases: [] };
        customerStorage.insert(customer.id, customer);
        return Ok(customer);
    }),

    /**
     * Updates a customer's information
     * @param {Customer} payload - The updated information for the customer
     */
    updateCustomer: update([Customer], Result(Customer, Message), (payload) => {
        if (!customerStorage.containsKey(payload.id)) {
            return Err({ NotFound: `Customer with id=${payload.id} not found` });
        }
        customerStorage.insert(payload.id, payload);
        return Ok(payload);
    }),

    /**
     * Deletes a customer from the database by ID
     * @param {string} id - The ID of the customer to be deleted
     */
    deleteCustomer: update([text], Result(text, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const deletedCustomerOpt = customerStorage.remove(id);
        if (!deletedCustomerOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Customer with id=${id} not found` });
        }
        return Ok(deletedCustomerOpt.Some.id);
    }),

    /**
     * Adds an interaction to a customer's interaction history
     * @param {string} customerId - The ID of the customer to receive the interaction
     * @param {InteractionPayload} payload - The information needed to create a new interaction
     */
    addInteraction: update([text, InteractionPayload], Result(text, Message), (customerId, payload) => {
        if (!isValidUUID(customerId)) {
            return Err({ InvalidPayload: "Invalid customer UUID" });
        }
        if (!isValidPayload(payload)) {
            return Err({ InvalidPayload: "Invalid payload" });
        }
        const interaction = { id: generateUUID(), ...payload };
        const customerOpt = customerStorage.get(customerId);
        if (!customerOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Customer with id=${customerId} not found` });
        }
        const customer = customerOpt.Some;
        customer.interactions.push(interaction);
        customerStorage.insert(customer.id, customer);
        interactionStorage.insert(interaction.id, interaction);
        return Ok(interaction.id);
    }),

    /**
     * Retrieves all interactions for a given customer
     * @param {string} customerId - The ID of the customer whose interactions are being retrieved
     */
    getCustomerInteractions: query([text], Vec(Interaction), (customerId) => {
        if (!isValidUUID(customerId)) {
            return [];
        }
        const customerOpt = customerStorage.get(customerId);
        if (!customerOpt.hasOwnProperty("Some")) {
            return [];
        }
        return customerOpt.Some.interactions;
    }),

    /**
     * Adds a purchase to a customer's purchase history
     * @param {string} customerId - The ID of the customer making the purchase
     * @param {PurchasePayload} payload - The information needed to create a new purchase
     */
    addPurchase: update([text, PurchasePayload], Result(text, Message), (customerId, payload) => {
        if (!isValidUUID(customerId)) {
            return Err({ InvalidPayload: "Invalid customer UUID" });
        }
        if (!isValidPayload(payload)) {
            return Err({ InvalidPayload: "Invalid payload" });
        }
        const purchase = { id: generateUUID(), ...payload };
        const customerOpt = customerStorage.get(customerId);
        if (!customerOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Customer with id=${customerId} not found` });
        }
        const customer = customerOpt.Some;
        customer.purchases.push(purchase);
        customerStorage.insert(customer.id, customer);
        purchaseStorage.insert(purchase.id, purchase);
        return Ok(purchase.id);
    }),

    /**
     * Retrieves all purchases for a given customer
     * @param {string} customerId - The ID of the customer whose purchases are being retrieved
     */
    getCustomerPurchases: query([text], Vec(Purchase), (customerId) => {
        if (!isValidUUID(customerId)) {
            return [];
        }
        const customerOpt = customerStorage.get(customerId);
        if (!customerOpt.hasOwnProperty("Some")) {
            return [];
        }
        return customerOpt.Some.purchases;
    }),

    /**
     * Retrieves a purchase by ID
     * @param {string} id - The ID of the desired purchase
     */
    getPurchase: query([text], Result(Purchase, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const purchaseOpt = purchaseStorage.get(id);
        if (!purchaseOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Purchase with id=${id} not found` });
        }
        return Ok(purchaseOpt.Some);
    }),

    /**
     * Retrieves an interaction by ID
     * @param {string} id - The ID of the desired interaction
     */
    getInteraction: query([text], Result(Interaction, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const interactionOpt = interactionStorage.get(id);
        if (!interactionOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Interaction with id=${id} not found` });
        }
        return Ok(interactionOpt.Some);
    }),

    /**
     * Updates a given interaction
     * @param {Interaction} payload - The updated information for the interaction
     */
    updateInteraction: update([Interaction], Result(Interaction, Message), (payload) => {
        if (!interactionStorage.containsKey(payload.id)) {
            return Err({ NotFound: `Interaction with id=${payload.id} not found` });
        }
        interactionStorage.insert(payload.id, payload);
        return Ok(payload);
    }),

    /**
     * Deletes an interaction by ID
     * @param {string} id - The ID of the interaction to be deleted
     */
    deleteInteraction: update([text], Result(text, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const deletedInteractionOpt = interactionStorage.remove(id);
        if (!deletedInteractionOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Interaction with id=${id} not found` });
        }
        return Ok(deletedInteractionOpt.Some.id);
    }),

    /**
     * Updates a given purchase
     * @param {Purchase} payload - The updated information for the purchase
     */
    updatePurchase: update([Purchase], Result(Purchase, Message), (payload) => {
        if (!purchaseStorage.containsKey(payload.id)) {
            return Err({ NotFound: `Purchase with id=${payload.id} not found` });
        }
        purchaseStorage.insert(payload.id, payload);
        return Ok(payload);
    }),

    /**
     * Deletes a purchase by ID
     * @param {string} id - The ID of the purchase to be deleted
     */
    deletePurchase: update([text], Result(text, Message), (id) => {
        if (!isValidUUID(id)) {
            return Err({ InvalidPayload: "Invalid UUID" });
        }
        const deletedPurchaseOpt = purchaseStorage.remove(id);
        if (!deletedPurchaseOpt.hasOwnProperty("Some")) {
            return Err({ NotFound: `Purchase with id=${id} not found` });
        }
        return Ok(deletedPurchaseOpt.Some.id);
    }),

    /**
     * Filters interactions by status
     * @param {string} status - The status to filter by
     */
    filterByStatus: query([text], Vec(Interaction), (status) => {
        return interactionStorage.values().filter(interaction => interaction.status.toLowerCase() === status.toLowerCase());
    }),

    /**
     * Retrieves all purchases for a given date
     * @param {string} date - The date to filter by
     */
    getPurchasesByDate: query([text], Vec(Purchase), (date) => {
        return purchaseStorage.values().filter(purchase => purchase.date.toLowerCase() === date.toLowerCase());
    }),

});

/**
 * Checks if a UUID is valid
 * @param {string} uuid - The UUID to check
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Checks if a payload is valid
 * @param {object} payload - The payload to check
 */
function isValidPayload(payload) {
    return typeof payload === "object" && Object.keys(payload).length > 0;
}

/**
 * Generates a UUID using SHA-256 hashing
 */
function generateUUID() {
    const timestamp = new Date().toISOString();
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomBytesString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const hash = sha256.create().update(timestamp + randomBytesString).digest();
    const hashBytes = new Uint8Array(hash);
    const hashBytesString = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const uuidString = `${hashBytesString.substr(0, 8)}-${hashBytesString.substr(8, 4)}-4${hashBytesString.substr(13, 3)}-${((hashBytes[16] & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hashBytesString.substr(17, 2)}-${hashBytesString.substr(20, 12)}`;
    return uuidString;
}
 
