"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncFragrances = exports.deleteFragrance = exports.updateFragrance = exports.addFragrance = exports.selectAllFragrances = void 0;
const sequelize_1 = require("../config/sequelize");
const axios_1 = __importDefault(require("axios"));
const apiToken = process.env.MONDAY_API_TOKEN;
const mondayApiToken = axios_1.default.create({
    baseURL: 'https://api.monday.com/v2',
    headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json'
    }
});
const selectAllFragrances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // SELECT ALL FRAGRANCES IN DATABASE
        const selectAll = yield sequelize_1.sequelize.query('EXECUTE GetAllFragrances');
        // MONDAY.COM API INTEGRATION
        const query = `
      {
        boards (ids: [${process.env.BOARD_ID_FRAGRANCES}]) {
          items {
            id
            name
            column_values {
              id
              text
            }
          }
        }
      }`;
        let mondayApiResponse = {};
        if (apiToken) {
            const response = yield mondayApiToken.post('', { query });
            mondayApiResponse = response.data;
        }
        // COMBINE DATABASE + MONDAY API RESULTS
        const result = {
            fragrances: selectAll[0],
            mondayApi: mondayApiResponse
        };
        // SEND COALESCED RESULTS
        res.json(result);
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.selectAllFragrances = selectAllFragrances;
const addFragrance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // FRAGRANCE DATA PAYLOAD
        const { name, description, category, created_at, updated_at, image_url } = req.body;
        // ADD FRAGRANCE TO DATABASE
        const response = yield sequelize_1.sequelize.query('EXECUTE AddFragrance :name, :description, :category, :created_at, :updated_at, :image_url', {
            replacements: { name, description, category, created_at, updated_at, image_url }
        });
        const fragranceId = response[0].id;
        // ADD FRAGRANCE TO MONDAY.COM BOARD
        const mutation = `
      mutation {
        create_item (board_id: ${process.env.BOARD_ID_FRAGRANCES}, item_name: "${name}", column_values: "${JSON.stringify({
            description: { text: description },
            category: { text: category },
            image_url: { text: image_url },
            created_at: { text: created_at },
            updated_at: { text: updated_at }
        }).replace(/"/g, '\\"')}")
      }`;
        if (apiToken) {
            const mondayResponse = yield mondayApiToken.post('', { query: mutation });
            console.log("Monday API Response: ", mondayResponse.data);
        }
        res.json(response[0]);
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.addFragrance = addFragrance;
const updateFragrance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // FRAGRANCE DATA PAYLOAD
        const { id, name, description, category, updated_at, image_url } = req.body;
        // UPDATE FRAGRANCE IN DATABASE
        const response = yield sequelize_1.sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
            replacements: { id, name, description, category, updated_at, image_url }
        });
        // UPDATE FRAGRANCE IN MONDAY.COM BOARD
        const mutation = `
  mutation {
    change_multiple_column_values (board_id: ${process.env.BOARD_ID_FRAGRANCES}, item_id: ${id}, column_values: "${JSON.stringify({
            description: { text: description },
            category: { text: category },
            image_url: { text: image_url },
            updated_at: { text: updated_at }
        }).replace(/"/g, '\\"')}")
  }`;
        if (apiToken) {
            const mondayResponse = yield mondayApiToken.post('', { query: mutation });
            console.log("Monday API Response: ", mondayResponse.data);
        }
        res.json(response[0]);
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.updateFragrance = updateFragrance;
const deleteFragrance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // FRAGRANCE DATA PAYLOAD
        const { id } = req.body;
        // DELETE FRAGRANCE FROM DATABASE
        yield sequelize_1.sequelize.query('EXECUTE DeleteFragrance :id', {
            replacements: { id }
        });
        // DELETE FRAGRANCE FROM MONDAY.COM BOARD
        const mutation = `
      mutation {
        delete_item (item_id: ${id})
      }`;
        if (apiToken) {
            const mondayResponse = yield mondayApiToken.post('', { query: mutation });
            console.log("Monday API Response: ", mondayResponse.data);
        }
        res.json(`Fragrance ${id} deleted successfully`);
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.deleteFragrance = deleteFragrance;
const getFragrancesFromMonday = () => __awaiter(void 0, void 0, void 0, function* () {
    const query = `
    { boards (limit:1) {
      name
      id
      description
      items {
        name
        column_values {
          title
          id
          type
          text
    } } } }`;
    try {
        const response = yield mondayApiToken.post('', { query });
        console.log('Monday API Response:', JSON.stringify(response.data, null, 2));
        if (response.data.errors) {
            response.data.errors.forEach((error) => {
                if (error.extensions.code === 'undefinedField') {
                    console.error(`Field '${error.extensions.fieldName}' doesn't exist on type '${error.extensions.typeName}'`);
                }
            });
            return [];
        }
        if (response.data && response.data.data && response.data.data.boards && response.data.data.boards[0]) {
            return response.data.data.boards[0].items_page.items || [];
        }
        else {
            console.error('Unexpected response format:', response.data);
            return [];
        }
    }
    catch (error) {
        console.error('Error fetching fragrances from Monday.com:', error);
        return [];
    }
});
const syncFragrances = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // FETCH ALL FRAGRANCES FROM DATABASE
        const fragrances = yield sequelize_1.sequelize.query('EXECUTE GetAllFragrances');
        // FETCH ALL EXISTING ITEMS FROM MONDAY.COM BOARD
        const existingItems = yield getFragrancesFromMonday();
        // VERIFY existingItems IS AN ARRAY
        if (!Array.isArray(existingItems)) {
            console.error('existingItems is not an array:', existingItems);
            return;
        }
        // CREATE MAP OF EXISTING ITEMS BY NAME
        const existingItemsMap = new Map();
        existingItems.forEach((item) => {
            existingItemsMap.set(item.name, item);
        });
        console.log({ existingItems });
        // COUNTER FOR RATE LIMITING
        let processedItems = 0;
        const maxItems = 2;
        // START LOOP FROM THE SECOND ITEM (INDEX 1)
        for (let i = 1; i < fragrances[0].length; i++) {
            if (processedItems >= maxItems) {
                break;
            }
            const fragrance = fragrances[0][i];
            const existingItem = existingItemsMap.get(fragrance.name);
            if (existingItem) {
                // UPDATE EXISTING ITEM
                const mutation = `
          mutation {
            change_multiple_column_values (
              board_id: ${process.env.BOARD_ID_FRAGRANCES},
              item_id: ${existingItem.id},
              column_values: "${JSON.stringify({
                    description: fragrance.description,
                    category: fragrance.category,
                    image_url: fragrance.image_url,
                    created_at: fragrance.created_at,
                    updated_at: fragrance.updated_at
                }).replace(/"/g, '\\"')}"
            ) {
              id
              name
            }
          }`;
                try {
                    const mondayResponse = yield mondayApiToken.post('', { query: mutation });
                    console.log("Monday API Update Response: ", mondayResponse.data);
                }
                catch (error) {
                    console.error('Error updating item in Monday.com:', error);
                }
            }
            else {
                // CREATE A NEW ITEM
                const mutation = `
          mutation {
            create_item (
              board_id: ${process.env.BOARD_ID_FRAGRANCES},
              item_name: "${fragrance.name}",
              column_values: "${JSON.stringify({
                    description: fragrance.description,
                    category: fragrance.category,
                    image_url: fragrance.image_url,
                    created_at: fragrance.created_at,
                    updated_at: fragrance.updated_at
                }).replace(/"/g, '\\"')}"
            ) {
              id
              name
            }
          }`;
                try {
                    const mondayResponse = yield mondayApiToken.post('', { query: mutation });
                    console.log("Monday API Create Response: ", mondayResponse.data);
                }
                catch (error) {
                    console.error('Error creating item in Monday.com:', error);
                }
            }
            processedItems++;
        }
    }
    catch (error) {
        console.error('Error syncing fragrances:', error);
    }
});
exports.syncFragrances = syncFragrances;
const syncOrders = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield sequelize_1.sequelize.query('EXECUTE GetAllOrders');
        for (const order of orders[0]) {
            const mutation = `
        mutation {
          create_item (board_id: ${process.env.BOARD_ID_ORDERS}, item_name: "Order ${order.id}", column_values: "${JSON.stringify({
                created_at: { text: order.created_at },
                number_of_kits: { text: order.number_of_kits },
                fragrance1_id: { text: order.fragrance1_id },
                fragrance2_id: { text: order.fragrance2_id },
                fragrance3_id: { text: order.fragrance3_id }
            }).replace(/"/g, '\\"')}")
        }`;
            const mondayResponse = yield mondayApiToken.post('/', { query: mutation });
            console.log("Monday API Response: ", mondayResponse.data);
        }
    }
    catch (error) {
        console.error('Error syncing orders:', error);
    }
});
const syncData = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, exports.syncFragrances)();
    // await syncOrders();
});
// DISABLED: AUTOMATICALLY SYNC WITH DATABASE
// syncData().then((): void => {
//   console.log('Data synced successfully');
// }).catch(error => {
//   console.error('Error during data sync:', error);
// });
// TODO: BASED ON THE CURRENT IMPLEMENTATION OF THE MONDAY.COM API INTEGRATION, WE CAN QUERY FRAGRANCE DATA FROM BOTH THE DATABASE AND API. WE ATTEMPT TO MAP THE DATA AND CHECK FOR VALID ENTRIES IN THE EXISTING BOARD; CRUD IS PERFORMED ACCORDINGLY. CURRENTLY I'M HAVING DIFFICULTY SYNCHRONIZING THE TABLE WITH THE DATABASE. THE NAMES OF THE FRAGRANCES APPEAR BUT THAT'S IT. VIEW THE CONSOLE FOR A BETTER UNDERSTANDING OF THE ERROR. IT COULD HAVE TO DO WITH A POTENTIAL MISMATCH BETWEEN THE BOARD COLUMNS AND THE DATABASE COLUMNS (THERE'S A NAME COLUMN IN BOTH TABLES, BUT ALSO A FRAGRANCE COLUMN IN THE MONDAY BOARD THAT SHOWS THE NAME --- POSSIBLE MISMATCH? OVERLOAD?). AUTO-SYNC IS DISABLED TO LIMIT API CALLS. *** READ THE MONDAY.COM API DOCUMENTATION TO TROUBLESHOOT. AT ONE POINT, YOU WERE ABLE TO MAKE CLEAN GRAPHQL QUERIES AGAINST THE API (SEE mondayApiResponse VARIABLE) ***
