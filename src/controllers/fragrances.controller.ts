import { Request, Response } from 'express';
import { sequelize } from "../config/sequelize";
import axios, { AxiosInstance, AxiosResponse } from 'axios';

const apiToken: string | undefined = process.env.MONDAY_API_TOKEN;
const mondayApiToken: AxiosInstance = axios.create({
  baseURL: 'https://api.monday.com/v2',
  headers: {
    Authorization: apiToken,
    'Content-Type': 'application/json'
  }
});

export const selectAllFragrances = async (req: Request, res: Response): Promise<void> => {
  try {
    // SELECT ALL FRAGRANCES IN DATABASE
    const selectAll = await sequelize.query('EXECUTE GetAllFragrances');

    // MONDAY.COM API INTEGRATION
    const query: string = `
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

    let mondayApiResponse: any = {};
    if (apiToken) {
      const response = await mondayApiToken.post('', { query });
      mondayApiResponse = response.data;
    }

    // COMBINE DATABASE + MONDAY API RESULTS
    const result = {
      fragrances: selectAll[0],
      mondayApi: mondayApiResponse
    };

    // SEND COALESCED RESULTS
    res.json(result);

  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
}

export const addFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    // FRAGRANCE DATA PAYLOAD
    const { name, description, category, created_at, updated_at, image_url } = req.body;

    // ADD FRAGRANCE TO DATABASE
    const response: any = await sequelize.query('EXECUTE AddFragrance :name, :description, :category, :created_at, :updated_at, :image_url', {
      replacements: { name, description, category, created_at, updated_at, image_url }
    });

    const fragranceId: number = response[0].id;

    // ADD FRAGRANCE TO MONDAY.COM BOARD
    const mutation: string = `
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
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }

    res.json(response[0]);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
}

export const updateFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    // FRAGRANCE DATA PAYLOAD
    const { id, name, description, category, updated_at, image_url } = req.body;

    // UPDATE FRAGRANCE IN DATABASE
    const response = await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url }
    });

    // UPDATE FRAGRANCE IN MONDAY.COM BOARD
    const mutation: string = `
  mutation {
    change_multiple_column_values (board_id: ${process.env.BOARD_ID_FRAGRANCES}, item_id: ${id}, column_values: "${JSON.stringify({
      description: { text: description },
      category: { text: category },
      image_url: { text: image_url },
      updated_at: { text: updated_at }
    }).replace(/"/g, '\\"')}")
  }`;


    if (apiToken) {
      const mondayResponse = await mondayApiToken.post('', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }

    res.json(response[0]);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
}

export const deleteFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    // FRAGRANCE DATA PAYLOAD
    const { id } = req.body;

    // DELETE FRAGRANCE FROM DATABASE
    await sequelize.query('EXECUTE DeleteFragrance :id', {
      replacements: { id }
    });

    // DELETE FRAGRANCE FROM MONDAY.COM BOARD
    const mutation: string = `
      mutation {
        delete_item (item_id: ${id})
      }`;

    if (apiToken) {
      const mondayResponse = await mondayApiToken.post('', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }

    res.json(`Fragrance ${id} deleted successfully`);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
}

const getFragrancesFromMonday = async (): Promise<any[]> => {
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
    const response = await mondayApiToken.post('', { query });
    console.log('Monday API Response:', JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      response.data.errors.forEach((error: any) => {
        if (error.extensions.code === 'undefinedField') {
          console.error(`Field '${error.extensions.fieldName}' doesn't exist on type '${error.extensions.typeName}'`);
        }
      });
      return [];
    }

    if (response.data && response.data.data && response.data.data.boards && response.data.data.boards[0]) {
      return response.data.data.boards[0].items_page.items || [];
    } else {
      console.error('Unexpected response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching fragrances from Monday.com:', error);
    return [];
  }
};

export const syncFragrances = async (): Promise<void> => {
  try {
    // FETCH ALL FRAGRANCES FROM DATABASE
    const fragrances: any = await sequelize.query('EXECUTE GetAllFragrances');

    // FETCH ALL EXISTING ITEMS FROM MONDAY.COM BOARD
    const existingItems: any[] = await getFragrancesFromMonday();

    // VERIFY existingItems IS AN ARRAY
    if (!Array.isArray(existingItems)) {
      console.error('existingItems is not an array:', existingItems);
      return;
    }

    // CREATE MAP OF EXISTING ITEMS BY NAME
    const existingItemsMap = new Map<string, any>();
    existingItems.forEach((item: any): void => {
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
        const mutation: string = `
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
          const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
          console.log("Monday API Update Response: ", mondayResponse.data);
        } catch (error) {
          console.error('Error updating item in Monday.com:', error);
        }
      } else {
        // CREATE A NEW ITEM
        const mutation: string = `
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
          const mondayResponse = await mondayApiToken.post('', { query: mutation });
          console.log("Monday API Create Response: ", mondayResponse.data);
        } catch (error) {
          console.error('Error creating item in Monday.com:', error);
        }
      }

      processedItems++;
    }
  } catch (error) {
    console.error('Error syncing fragrances:', error);
  }
};


const syncOrders = async (): Promise<void> => {
  try {
    const orders: any = await sequelize.query('EXECUTE GetAllOrders');

    for (const order of orders[0]) {
      const mutation: string = `
        mutation {
          create_item (board_id: ${process.env.BOARD_ID_ORDERS}, item_name: "Order ${order.id}", column_values: "${JSON.stringify({
        created_at: {text: order.created_at},
        number_of_kits: {text: order.number_of_kits},
        fragrance1_id: {text: order.fragrance1_id},
        fragrance2_id: {text: order.fragrance2_id},
        fragrance3_id: {text: order.fragrance3_id}
      }).replace(/"/g, '\\"')}")
        }`;

      const mondayResponse = await mondayApiToken.post('/', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
  }
};

const syncData = async (): Promise<void> => {
  await syncFragrances();
  // await syncOrders();
};

// DISABLED: AUTOMATICALLY SYNC WITH DATABASE
// syncData().then((): void => {
//   console.log('Data synced successfully');
// }).catch(error => {
//   console.error('Error during data sync:', error);
// });

// TODO: BASED ON THE CURRENT IMPLEMENTATION OF THE MONDAY.COM API INTEGRATION, WE CAN QUERY FRAGRANCE DATA FROM BOTH THE DATABASE AND API. WE ATTEMPT TO MAP THE DATA AND CHECK FOR VALID ENTRIES IN THE EXISTING BOARD; CRUD IS PERFORMED ACCORDINGLY. CURRENTLY I'M HAVING DIFFICULTY SYNCHRONIZING THE TABLE WITH THE DATABASE. THE NAMES OF THE FRAGRANCES APPEAR BUT THAT'S IT. VIEW THE CONSOLE FOR A BETTER UNDERSTANDING OF THE ERROR. IT COULD HAVE TO DO WITH A POTENTIAL MISMATCH BETWEEN THE BOARD COLUMNS AND THE DATABASE COLUMNS (THERE'S A NAME COLUMN IN BOTH TABLES, BUT ALSO A FRAGRANCE COLUMN IN THE MONDAY BOARD THAT SHOWS THE NAME --- POSSIBLE MISMATCH? OVERLOAD?). AUTO-SYNC IS DISABLED TO LIMIT API CALLS. *** READ THE MONDAY.COM API DOCUMENTATION TO TROUBLESHOOT. AT ONE POINT, YOU WERE ABLE TO MAKE CLEAN GRAPHQL QUERIES AGAINST THE API (SEE mondayApiResponse VARIABLE) ***