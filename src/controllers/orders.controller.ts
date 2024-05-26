import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import mondaySdk from 'monday-sdk-js';
import * as util from "node:util";

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

    const numberOfKits: number = parseInt(number_of_kits, 10);
    const fragrance1Id: number = parseInt(fragrance1_id, 10);
    const fragrance2Id: number = parseInt(fragrance2_id, 10);
    const fragrance3Id: number = parseInt(fragrance3_id, 10);

    const response: any = await sequelize.query(
      'EXECUTE CreateOrder :first_name, :last_name, :number_of_kits, :fragrance1_id, :fragrance2_id, :fragrance3_id',
      {
        replacements: {
          first_name,
          last_name,
          number_of_kits: numberOfKits,
          fragrance1_id: fragrance1Id,
          fragrance2_id: fragrance2Id,
          fragrance3_id: fragrance3Id
        }
      }
    );

    const orderId = response[0][0].NewOrderID;

    const mutation: string = `
      mutation {
        create_item (
          board_id: ${process.env.BOARD_ID_ORDERS},
          item_name: "${orderId}",
          column_values: "${JSON.stringify({
            first_name__1: first_name,
            text__1: last_name,
            status7__1: status,
            quantity__1: numberOfKits,
            fragrance_1_id1__1: fragrance1Id,
            numbers__1: fragrance2Id,
            fragrance_3_id__1: fragrance3Id,
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
    const status = req.body.event.value.label.text;
    const id = req.body.event.pulseName;

    await sequelize.query('EXECUTE UpdateOrderStatus :id, :status', {
      replacements: { id, status }
    });

    res.status(200).send('Order status updated successfully');
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

// DEPRECATED
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
    console.log(util.inspect(response.data.data.boards[0].items_page, true, null, true));
    if (response.data.errors) {
      throw new Error(`Error fetching items: ${response.data.errors[0].message}`);
    }
    return response.data.data.boards[0].items_page.items;
  } catch (error) {
    console.error('Error fetching items from Monday.com:', error);
    throw error;
  }
};

// DEPRECATED
export const syncOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId: string = process.env.BOARD_ID_ORDERS!;
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
            item_name: "${item.id}",
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

/** UTILITY FUNCTIONS */
const throttle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
