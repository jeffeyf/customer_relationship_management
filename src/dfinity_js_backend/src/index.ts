import { query, update, text, Record, StableBTreeMap, Variant, Vec, None, Some, Ok, Err, ic, Principal, Opt, nat64, Duration, Result, bool, Canister } from "azle";
import {
    Ledger, binaryAddressFromAddress, binaryAddressFromPrincipal, hexAddressFromPrincipal
} from "azle/canisters/ledger";
import { hashCode } from "hashcode";
import { v4 as uuidv4 } from "uuid";

const Interaction = Record({
    id: text,
    date: text,
    interaction_type: text,
    description: text,
    status: text,
    comments: text
});

const Purchase = Record({
    id: text,
    date: text,
    product: text,
    quantity: text,
    price: text,
});

const Customer = Record({
    id: text,
    name: text,
    company: text,
    email: text,
    phone: text,
    interactions: Vec(Interaction),
    purchases: Vec(Purchase)
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
    comments: text
});

const PurchasePayload = Record({
    date: text,
    product: text,
    quantity: text,
    price: text,
});


const Message = Variant({
    NotFound: text,
    InvalidPayload: text,
});

const customerStorage = StableBTreeMap(0, text, Customer);
const interactionStorage = StableBTreeMap(1, text, Interaction);
const purchaseStorage = StableBTreeMap(2, text, Purchase);



export default Canister({
    getCustomers: query([], Vec(Customer), () => {
        return customerStorage.values();
    }),

    getCustomer: query([text], Result(Customer, Message), (id) => {
        const customerOpt = customerStorage.get(id);
        if ("None" in customerOpt) {
            return Err({ NotFound: `customer with id=${id} not found` });
        }
        return Ok(customerOpt.Some);
    }),

    addCustomer: update([CustomerPayload], Result(Customer, Message), (payload) => {
        if (typeof payload !== "object" || Object.keys(payload).length === 0) {
            return Err({ NotFound: "invalid payoad" })
        }
        const customer = { id: uuidv4(), ...payload, interactions: [], purchases: [] };
        customerStorage.insert(customer.id, customer);
        return Ok(customer);
    }),

    updateCustomer: update([Customer], Result(Customer, Message), (payload) => {
        const customerOpt = customerStorage.get(payload.id);
        if ("None" in customerOpt) {
            return Err({ NotFound: `cannot update the customer: customer with id=${payload.id} not found` });
        }
        customerStorage.insert(customerOpt.Some.id, payload);
        return Ok(payload);
    }),

    deleteCustomer: update([text], Result(text, Message), (id) => {
        const deletedCustomerOpt = customerStorage.remove(id);
        if ("None" in deletedCustomerOpt) {
            return Err({ NotFound: `cannot delete the customer: customer with id=${id} not found` });
        }
        return Ok(deletedCustomerOpt.Some.id);
    }),

    addInteraction: update([text, InteractionPayload], Result(text, Message), (customerId, payload) => {
        if (typeof payload !== "object" || Object.keys(payload).length === 0) {
            return Err({ NotFound: "invalid payoad" })
        }
        const interaction = { id: uuidv4(), ...payload };
        const customerOpt = customerStorage.get(customerId);
        if ("None" in customerOpt) {
            return Err({ NotFound: `cannot add interaction: customer with id=${customerId} not found` });
        }
        const customer = customerOpt.Some;
        customer.interactions.push(interaction);
        customerStorage.insert(customer.id, customer);
        interactionStorage.insert(interaction.id, interaction);
        return Ok(interaction.id);
    }),

    getCustomerInteractions: query([text], Vec(Interaction), (customerId) => {
        const customerOpt = customerStorage.get(customerId);
        if ("None" in customerOpt) {
            return [];
        }
        return customerOpt.Some.interactions;
    }),

    addPurchase: update([text, PurchasePayload], Result(text, Message), (customerId, payload) => {
        if (typeof payload !== "object" || Object.keys(payload).length === 0) {
            return Err({ NotFound: "invalid payoad" })
        }
        const purchase = { id: uuidv4(), ...payload };
        const customerOpt = customerStorage.get(customerId);
        if ("None" in customerOpt) {
            return Err({ NotFound: `cannot add purchase: customer with id=${customerId} not found` });
        }
        const customer = customerOpt.Some;
        customer.purchases.push(purchase);
        customerStorage.insert(customer.id, customer);
        purchaseStorage.insert(purchase.id, purchase);
        return Ok(purchase.id);
    }),

    getCustomerPurchases: query([text], Vec(Purchase), (customerId) => {
        const customerOpt = customerStorage.get(customerId);
        if ("None" in customerOpt) {
            return [];
        }
        return customerOpt.Some.purchases;
    }),

    getPurchase: query([text], Result(Purchase, Message), (id) => {
        const purchaseOpt = purchaseStorage.get(id);
        if ("None" in purchaseOpt) {
            return Err({ NotFound: `purchase with id=${id} not found` });
        }
        return Ok(purchaseOpt.Some);
    }),

    getInteraction: query([text], Result(Interaction, Message), (id) => {
        const interactionOpt = interactionStorage.get(id);
        if ("None" in interactionOpt) {
            return Err({ NotFound: `interaction with id=${id} not found` });
        }
        return Ok(interactionOpt.Some);
    }),

    updateInteraction: update([Interaction], Result(Interaction, Message), (payload) => {
        const interactionOpt = interactionStorage.get(payload.id);
        if ("None" in interactionOpt) {
            return Err({ NotFound: `cannot update the interaction: interaction with id=${payload.id} not found` });
        }
        interactionStorage.insert(interactionOpt.Some.id, payload);
        return Ok(payload);
    }),

    deleteInteraction: update([text], Result(text, Message), (id) => {
        const deletedInteractionOpt = interactionStorage.remove(id);
        if ("None" in deletedInteractionOpt) {
            return Err({ NotFound: `cannot delete the interaction: interaction with id=${id} not found` });
        }
        return Ok(deletedInteractionOpt.Some.id);
    }),

    updatePurchase: update([Purchase], Result(Purchase, Message), (payload) => {
        const purchaseOpt = purchaseStorage.get(payload.id);
        if ("None" in purchaseOpt) {
            return Err({ NotFound: `cannot update the purchase: purchase with id=${payload.id} not found` });
        }
        purchaseStorage.insert(purchaseOpt.Some.id, payload);
        return Ok(payload);
    }),

    deletePurchase: update([text], Result(text, Message), (id) => {
        const deletedPurchaseOpt = purchaseStorage.remove(id);
        if ("None" in deletedPurchaseOpt) {
            return Err({ NotFound: `cannot delete the purchase: purchase with id=${id} not found` });
        }
        return Ok(deletedPurchaseOpt.Some.id);
    }),

    // Filter Interaction by status
    filterByStatus: query([text], Vec(Interaction), (status) => {
        return interactionStorage.values().filter(interaction => interaction.status.toLowerCase() === status.toLowerCase());
    }),

  


    // get all purchases of a specific date
    getPurchasesByDate: query([text], Vec(Purchase), (date) => {
        return purchaseStorage.values().filter(purchase => purchase.date.toLowerCase() === date.toLowerCase());
    }),

   
});

/*
    a hash function that is used to generate correlation ids for orders.
    also, we use that in the verifyPayment function where we check if the used has actually paid the order
*/
function hash(input: any): nat64 {
    return BigInt(Math.abs(hashCode().value(input)));
};

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};

