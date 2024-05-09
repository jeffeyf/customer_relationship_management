import { query, update, text, Record, StableBTreeMap, Variant, Vec, None, Some, Ok, Err, ic, Principal, nat64, Canister } from "azle";
import { hashCode } from "hashcode";

// Define record types for Customer interactions
const Interaction = Record({
    id: text,
    date: text,
    interaction_type: text,
    description: text,
    status: text,
    comments: text
});

// Define record types for Customer purchases
const Purchase = Record({
    id: text,
    date: text,
    product: text,
    quantity: text,
    price: text,
});

// Define record type for Customer
const Customer = Record({
    id: text,
    name: text,
    company: text,
    email: text,
    phone: text,
    interactions: Vec(Interaction),
    purchases: Vec(Purchase)
});

// Define payload types for creating Customer, Interaction, and Purchase
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

// Define variant type for response messages
const Message = Variant({
    NotFound: text,
    InvalidPayload: text,
});

// Define stable BTree maps for storing Customers, Interactions, and Purchases
const customerStorage = StableBTreeMap(0, text, Customer);
const interactionStorage = StableBTreeMap(1, text, Interaction);
const purchaseStorage = StableBTreeMap(2, text, Purchase);

export default Canister({
    // Query function to retrieve all customers
    getCustomers: query([], Vec(Customer), () => {
        return customerStorage.values();
    }),

    // Query function to retrieve a specific customer by ID
    getCustomer: query([text], Result(Customer, Message), (id) => {
        const customerOpt = customerStorage.get(id);
        return customerOpt.match({
            None: () => Err({ NotFound: `Customer with ID ${id} not found` }),
            Some: (customer) => Ok(customer)
        });
    }),

    // Update function to add a new customer
    addCustomer: update([CustomerPayload], Result(Customer, Message), (payload) => {
        // Validate payload
        if (!payload.name || !payload.email) {
            return Err({ InvalidPayload: "Name and email are required" });
        }
        const customer = { id: hashCode().value(payload.email).toString(), ...payload, interactions: [], purchases: [] };
        customerStorage.insert(customer.id, customer);
        return Ok(customer);
    }),

    // Update function to update an existing customer
    updateCustomer: update([Customer], Result(Customer, Message), (updatedCustomer) => {
        const existingCustomer = customerStorage.get(updatedCustomer.id);
        return existingCustomer.match({
            None: () => Err({ NotFound: `Customer with ID ${updatedCustomer.id} not found` }),
            Some: () => {
                customerStorage.insert(updatedCustomer.id, updatedCustomer);
                return Ok(updatedCustomer);
            }
        });
    }),

    // Update function to delete a customer
    deleteCustomer: update([text], Result(text, Message), (id) => {
        const deletedCustomer = customerStorage.remove(id);
        return deletedCustomer.match({
            None: () => Err({ NotFound: `Customer with ID ${id} not found` }),
            Some: () => Ok(id)
        });
    }),

    // Update function to add a new interaction for a customer
    addInteraction: update([text, InteractionPayload], Result(text, Message), (customerId, payload) => {
        // Validate payload
        if (!payload.date || !payload.interaction_type) {
            return Err({ InvalidPayload: "Date and interaction type are required" });
        }
        const interactionId = hashCode().value(payload.date + customerId).toString();
        const interaction = { id: interactionId, ...payload };
        const existingCustomer = customerStorage.get(customerId);
        return existingCustomer.match({
            None: () => Err({ NotFound: `Customer with ID ${customerId} not found` }),
            Some: (customer) => {
                customer.interactions.push(interaction);
                customerStorage.insert(customerId, customer);
                interactionStorage.insert(interactionId, interaction);
                return Ok(interactionId);
            }
        });
    }),

    // Query function to retrieve all interactions of a specific customer
    getCustomerInteractions: query([text], Vec(Interaction), (customerId) => {
        const customer = customerStorage.get(customerId);
        return customer.match({
            None: () => [],
            Some: (c) => c.interactions
        });
    }),

    // Update function to add a new purchase for a customer
    addPurchase: update([text, PurchasePayload], Result(text, Message), (customerId, payload) => {
        // Validate payload
        if (!payload.date || !payload.product) {
            return Err({ InvalidPayload: "Date and product are required" });
        }
        const purchaseId = hashCode().value(payload.date + customerId).toString();
        const purchase = { id: purchaseId, ...payload };
        const existingCustomer = customerStorage.get(customerId);
        return existingCustomer.match({
            None: () => Err({ NotFound: `Customer with ID ${customerId} not found` }),
            Some: (customer) => {
                customer.purchases.push(purchase);
                customerStorage.insert(customerId, customer);
                purchaseStorage.insert(purchaseId, purchase);
                return Ok(purchaseId);
            }
        });
    }),

    // Query function to retrieve all purchases of a specific customer
    getCustomerPurchases: query([text], Vec(Purchase), (customerId) => {
        const customer = customerStorage.get(customerId);
        return customer.match({
            None: () => [],
            Some: (c) => c.purchases
        });
    }),

    // Query function to retrieve a specific purchase by ID
    getPurchase: query([text], Result(Purchase, Message), (id) => {
        const purchase = purchaseStorage.get(id);
        return purchase.match({
            None: () => Err({ NotFound: `Purchase with ID ${id} not found` }),
            Some: (p) => Ok(p)
        });
    }),

    // Query function to retrieve a specific interaction by ID
    getInteraction: query([text], Result(Interaction, Message), (id) => {
        const interaction = interactionStorage.get(id);
        return interaction.match({
            None: () => Err({ NotFound: `Interaction with ID ${id} not found` }),
            Some: (i) => Ok(i)
        });
    }),

    // Update function to update an existing interaction
    updateInteraction: update([Interaction], Result(Interaction, Message), (updatedInteraction) => {
        const existingInteraction = interactionStorage.get(updatedInteraction.id);
        return existingInteraction.match({
            None: () => Err({ NotFound: `Interaction with ID ${updatedInteraction.id} not found` }),
            Some: () => {
                interactionStorage.insert(updatedInteraction.id, updatedInteraction);
                return Ok(updatedInteraction);
            }
        });
    }),

    // Update function to delete an interaction
    deleteInteraction: update([text], Result(text, Message), (id) => {
        const deletedInteraction = interactionStorage.remove(id);
        return deletedInteraction.match({
            None: () => Err({ NotFound: `Interaction with ID ${id} not found` }),
            Some: () => Ok(id)
        });
    }),

    // Update function to update an existing purchase
    updatePurchase: update([Purchase], Result(Purchase, Message), (updatedPurchase) => {
        const existingPurchase = purchaseStorage.get(updatedPurchase.id);
        return existingPurchase.match({
            None: () => Err({ NotFound: `Purchase with ID ${updatedPurchase.id} not found` }),
            Some: () => {
                purchaseStorage.insert(updatedPurchase.id, updatedPurchase);
                return Ok(updatedPurchase);
            }
        });
    }),

    // Update function to delete a purchase
    deletePurchase: update([text], Result(text, Message), (id) => {
        const deletedPurchase = purchaseStorage.remove(id);
        return deletedPurchase.match({
            None: () => Err({ NotFound: `Purchase with ID ${id} not found` }),
            Some: () => Ok(id)
        });
    }),

    // Query function to filter interactions by status
    filterByStatus: query([text], Vec(Interaction), (status) => {
        return interactionStorage.values().filter(interaction => interaction.status.toLowerCase() === status.toLowerCase());
    }),

    // Query function to search customers by name
    searchCustomerByName: query([text], Vec(Customer), (name) => {
        return customerStorage.values().filter(customer => customer.name.toLowerCase() === name.toLowerCase());
    }),

    // Query function to retrieve purchases by date
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
