import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { Axios, AxiosInstance, AxiosResponse } from 'axios';
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

export const selectAllFragrances = async (req: Request, res: Response): Promise<void> => {
  try {
    const selectAll = await sequelize.query('EXECUTE GetAllFragrances');
    res.send(selectAll[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const addFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pulseId, pulseName } = req.body.event;
    const id = pulseId;
    const name = pulseName;

    const created_at: string = new Date().toISOString();
    const updated_at: string = new Date().toISOString();

    const response: any = await sequelize.query('EXECUTE AddFragrance :id, :name, :created_at, :updated_at', {
      replacements: { id, name, created_at, updated_at },
    })

  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const updateFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    // DESTRUCTURE DATA FROM MONDAY.COM UPDATE EVENT
    const { pulseId, pulseName, columnTitle, value } = req.body.event;
    const updated_at: string = new Date().toISOString();
    const id: number = pulseId;

    // DECLARE VARIABLES TO CAPTURE DATA FROM PAYLOAD
    let name: string | null = null;
    let description: string | null = null;
    let category: string | null = null;
    let image_url: string | null = null;


    // UPDATE IDENTIFIED COLUMN
    switch (columnTitle) {
      case 'Name':
        name = pulseName;
        break;
      case 'Description':
        description = value.value;
        break;
      case 'Category':
        category = value.label.text;
        break;
      case 'Image URL':
        image_url = value.value;
        break;
      default:
        res.status(400).send('Unknown column ID');
    }

    // EXECUTE STORED PROCEDURE WITH UPDATED VALUES
    const response = await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url },
    });

    // SEND RESPONSE
    res.json(`Fragrance ${ id } created successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const deleteFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.body.event;
    let id: number;

    if (itemId) {
      id = itemId;
    } else id = req.body.id;

    await sequelize.query('EXECUTE DeleteFragrance :id', {
      replacements: { id },
    });

    res.json(`Fragrance ${ id } deleted successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

// DEPRECATED
export const syncFragrances = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId: string = process.env.BOARD_ID_FRAGRANCES!;

    const existingItems = await fetchAllFragrancesFromMonday();

    const deletePromises = existingItems.items.map((item: any) => {
      const deleteMutation: string = `
        mutation {
          delete_item(item_id: ${item.id}) {
            id
          }
        }
      `;
      throttle(200);
      return mondayApiToken.post('', { query: deleteMutation })
    });

    await Promise.all(deletePromises);

    const dbFragrances: any = await sequelize.query('EXECUTE GetAllFragrances');
    const fragrances = dbFragrances[0];


    for (const item of fragrances) {
      console.log(item);
      const mutation: string = `
        mutation {
          create_item(
            board_id: ${boardId},
            item_name: "${ item.name }",
            column_values: "${JSON.stringify({
              text8__1: item.id.toString(),
              description__1: item.description,
              category56__1: item.category,
              text__1: item.image_url,
              text1__1: item.created_at,
              text2__1: item.updated_at,
            }).replace(/"/g, '\\"')}"
          ) {
            id
            name
          }
        }`;

      // Create item on Monday.com
      await mondayApiToken.post('', { query: mutation })
        .then((response: any) => console.log(response.data))
        .catch((error: any) => console.error(error));
    }

    res.status(200).send('Fragrances synchronized successfully');
  } catch (error: any) {
    console.error('Error syncing data:', error);
    res.status(500).send(error);
  }
};

// DEPRECATED
export const fetchAllFragrancesFromMonday = async (): Promise<any> => {
  // MONDAY.COM API QUERY
  const query: string = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        id
        name
        columns {
          id
          title
          type
        }
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  // BOARD ID VARIABLES
  const variables = { boardId: process.env.BOARD_ID_FRAGRANCES };

  try {
    const response: any = await mondayApiToken.post('', { query, variables });
    if (response.data.errors) {
      throw new Error(`Error fetching items: ${response.data.errors[0].message}`);
    }
    // console.log(response.data.data);
    return response.data.data.boards[0].items_page;
  } catch (error) {
    console.error('Error fetching items from Monday.com:', error);
    throw error;
  }
};

/** UTILITY FUNCTIONS */
const throttle: Function = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

