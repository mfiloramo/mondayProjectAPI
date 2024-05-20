import { Request, Response } from "express";
import { sequelize } from "../config/sequelize";
import axios, { AxiosInstance, AxiosResponse } from "axios";

const apiToken: string | undefined = process.env.MONDAY_API_TOKEN;
const mondayApiToken: AxiosInstance = axios.create({
  baseURL: 'https://api.monday.com/v2',
  headers: {
    Authorization: apiToken,
    'Content-Type': 'application/json'
  }
});

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // SELECT ALL ORDERS IN DATABASE
    const selectAll = await sequelize.query('EXECUTE GetAllOrders');
    res.send(selectAll[0]);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      first_name,
      last_name,
      number_of_kits,
      fragrance1_id,
      fragrance2_id,
      fragrance3_id
    } = req.body;

    // QUERY DATABASE USING ORM
    const response: any = await sequelize.query(
      'EXECUTE CreateOrder :first_name, :last_name, :number_of_kits, :fragrance1_id, :fragrance2_id, :fragrance3_id',
      {
        replacements: {
          first_name,
          last_name,
          number_of_kits: parseInt(number_of_kits, 10),
          fragrance1_id: parseInt(fragrance1_id, 10),
          fragrance2_id: parseInt(fragrance2_id, 10),
          fragrance3_id: parseInt(fragrance3_id, 10)
        }
      }
    );

    // GET NEW ORDER ID FOR ITEM
    const orderId = response[0][0].NewOrderID;

    // SEND CHANGES TO MONDAY.COM BOARD
    const mutation: string = `
      mutation {
        create_item (
          board_id: ${ process.env.BOARD_ID_ORDERS },
          item_name: "Order ${ orderId }",
          column_values: "${ JSON.stringify({
            first_name: { text: first_name },
            last_name: { text: last_name },
            number_of_kits: { text: number_of_kits },
            fragrance1_id: { text: fragrance1_id },
            fragrance2_id: { text: fragrance2_id },
            fragrance3_id: { text: fragrance3_id },
            status: { text: 'pending' }
          }).replace(/"/g, '\\"') }"
        ) {
          id
          name
        }      }`;

    if (apiToken) {
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log("Success! Monday API Response: ", mondayResponse.data);
    }

    res.json({ orderId });
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // ORDER DATA PAYLOAD
    const { id, status } = req.body;

    // UPDATE ORDER IN DATABASE
    await sequelize.query('EXECUTE UpdateOrderStatus :id, :status', {
      replacements: { id, status }
    });

    // SEND 200 RESPONSE TO USER
    res.status(200).send('Order status updated successfully');
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
};

export const fetchAllOrdersFromMonday = async (boardId: string): Promise<any> => {
  let items: any[] = [];
  let cursor: string | null = null;

  const query = `
      query ($boardId: [ID!]!) {
        boards (ids: $boardId) {
          items_page (limit: 100) {
            items {
              id
              name
              column_values {
                text
              }
            }
          }
        }
      }
    `;

  try {
    const response: any = await mondayApiToken.post('', { query, mondayApiToken });

    if (response.data.errors) {
      throw new Error(`Error fetching items: ${ response.data.errors[0].message }`);
    }


    const data: any = response.data.data.boards[0].items_page;
    if (data) {
      items = items.concat(data.items);
      cursor = data.cursor;
    } else {
      return;
    }
  } catch (error) {
    console.error('Error fetching items from Monday.com:', error);
    throw error;
  }
}

// TODO: THIS BECOMES A CRON JOB
export const syncOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all items from Monday.com board
    const boardId = process.env.BOARD_ID_ORDERS!;
    const existingItems = await fetchAllOrdersFromMonday(boardId);

    // Delete all existing items from the board
    const deletePromises = existingItems.map((item: any) => {
      const deleteMutation = `
        mutation {
          delete_item(item_id: ${ item.id }) {
            id
          }
        }
      `;
      return mondayApiToken.post('', { query: deleteMutation });
    });

    await Promise.all(deletePromises);

    // Fetch all orders from the database
    const dbOrders: any = await sequelize.query('EXECUTE GetAllOrders');

    // Iterate over the fetched orders and add them to Monday.com board
    const addPromises = dbOrders[0].map((item: any) => {
      const mutation: string = `
        mutation {
          create_item (
            board_id: ${ boardId },
            item_name: "Order ${ item.order_id }",
            column_values: "${ JSON.stringify({
              first_name: { text: item.first_name },
              last_name: { text: item.last_name },
              number_of_kits: { text: item.number_of_kits },
              fragrance1_id: { text: item.fragrance1_id },
              fragrance2_id: { text: item.fragrance2_id },
              fragrance3_id: { text: item.fragrance3_id },
              status: { text: item.status }
            }).replace(/"/g, '\\"') }"
          ) {
            id
            name
          }
        }`;

      return mondayApiToken.post('', { query: mutation });
    });

    await Promise.all(addPromises);

    res.status(200).send('Orders synchronized successfully');
  } catch (error: any) {
    console.error('Error syncing data:', error);
    res.status(500).send(error);
  }
};

