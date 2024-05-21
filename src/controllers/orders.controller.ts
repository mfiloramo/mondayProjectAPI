import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
const apiToken: string | undefined = process.env.MONDAY_API_TOKEN;

const mondayApiToken: AxiosInstance = axios.create({
  baseURL: 'https://api.monday.com/v2',
  headers: {
    Authorization: apiToken,
    'Content-Type': 'application/json',
  },
});

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const selectAll = await sequelize.query('EXECUTE GetAllOrders');
    res.send(selectAll[0]);
  } catch (error: any) {
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
      fragrance3_id,
      status,
      created_at,
      updated_at
    } = req.body;

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

    const orderId = response[0][0].NewOrderID;

    const mutation: string = `
      mutation {
        create_item (
          board_id: ${process.env.BOARD_ID_ORDERS},
          item_name: "Order ${orderId}",
          column_values: "${JSON.stringify({
            first_name__1: first_name,
            text__1: last_name,
            status7__1: status,
            quantity__1: number_of_kits,
            fragrance_1_id1__1: fragrance1_id,
            numbers__1: fragrance2_id,
            fragrance_3_id__1: fragrance3_id,
            text34__1: created_at,
            text4__1: updated_at
          }).replace(/"/g, '\\"')}"
        ) {
          id
          name
        }
      }`;

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
    let { id, status, value } = req.body;

    // if (req.body.value.text) {
    //   status = req.body.value.text;
    // }

    console.log(req.body.value);

    id = 1
    status = 'Delivered';

    console.log(value);

    await sequelize.query('EXECUTE UpdateOrderStatus :id, :status', {
      replacements: { id, status }
    });

    res.status(200).send('Order status updated successfully');
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const fetchAllOrdersFromMonday = async (): Promise<any> => {
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

  const variables = { boardId: process.env.BOARD_ID_ORDERS };

  try {
    const response: any = await mondayApiToken.post('', { query, variables });
    if (response.data.errors) {
      throw new Error(`Error fetching items: ${response.data.errors[0].message}`);
    }
    return response.data.data.boards[0].items_page.items;
  } catch (error) {
    console.error('Error fetching items from Monday.com:', error);
    throw error;
  }
};

export const syncOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = process.env.BOARD_ID_ORDERS!;
    const existingItems = await fetchAllOrdersFromMonday();

    const deletePromises = existingItems.map((item: any) => {
      const deleteMutation: string = `
        mutation {
          delete_item(item_id: ${item.id}) {
            id
          }
        }
      `;
      throttle(200);
      return mondayApiToken.post('', { query: deleteMutation });
    });

    await Promise.all(deletePromises);

    const dbOrders: any = await sequelize.query('EXECUTE GetAllOrders');
    const items = dbOrders[0];

    for (const item of items) {
      const mutation: string = `
        mutation {
          create_item (
            board_id: ${boardId},
            item_name: "Order ${item.id}",
            column_values: "${JSON.stringify({
              first_name__1: item.first_name,
              text__1: item.last_name,
              status7__1: item.status,
              quantity__1: item.number_of_kits,
              fragrance_1_id1__1: item.fragrance1_id,
              numbers__1: item.fragrance2_id,
              fragrance_3_id__1: item.fragrance3_id,
              text34__1: item.created_at,
              text4__1: item.updated_at
      }).replace(/"/g, '\\"')}"
          ) {
            id
          }
        }`;
      const response = await mondayApiToken.post('', { query: mutation });
      console.log("Create Item Response: ", response.data);
      await throttle(300);
    }

    res.status(200).send('Orders synchronized successfully');
  } catch (error: any) {
    console.error('Error syncing data:', error);
    res.status(500).send(error);
  }
};

const throttle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
