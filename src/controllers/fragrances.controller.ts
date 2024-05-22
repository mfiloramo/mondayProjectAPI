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
    const { name, description, category, created_at, updated_at, image_url } = req.body;

    const response: any = await sequelize.query('EXECUTE AddFragrance :name, :description, :category, :created_at, :updated_at, :image_url', {
      replacements: { name, description, category, created_at, updated_at, image_url },
    });

    const fragranceId: number = response[0].id;

    const mutation: string = `
      mutation {
        create_item(
          board_id: ${process.env.BOARD_ID_FRAGRANCES},
          item_name: "${name}",
          column_values: "${JSON.stringify({
      name: { text: name },
      description: { text: description },
      category: { text: category },
      image_url: { text: image_url },
      created_at: { text: created_at },
      updated_at: { text: updated_at },
    }).replace(/"/g, '\\"')}"
        ) {
          id
          name
        }
      }`;

    if (apiToken) {
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log('Monday API Response: ', mondayResponse.data);
    }

    res.json(response[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const updateFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pulseName, columnTitle, value } = req.body.event;
    const updated_at: string = new Date().toISOString();

    let id: number = pulseName;
    let name: string | null = null;
    let description: string | null = null;
    let category: string | null = null;
    let image_url: string | null = null;


    // UPDATE IDENTIFIED COLUMN
    switch (columnTitle) {
      case 'Name':
        name = value.value;
        break;
      case 'Description':
        description = value.value;
        break;
      case 'Category':
        category = value.value.label.text;
        break;
      case 'Image URL':
        image_url = value.value;
        break;
      default:
        res.status(400).send('Unknown column ID');
    }

    // Execute the stored procedure with the updated values
    const response = await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url },
    });

    res.json(response[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
export const deleteFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await sequelize.query('EXECUTE DeleteFragrance :id', {
      replacements: { id },
    });

    const mutation: string = `
      mutation {
        delete_item(item_id: ${id}) {
          id
        }
      }`;

    if (apiToken) {
      const mondayResponse = await mondayApiToken.post('', { query: mutation });
      console.log('Monday API Response: ', mondayResponse.data);
    }

    res.json(`Fragrance ${id} deleted successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const syncFragrances = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = process.env.BOARD_ID_FRAGRANCES!;
    const existingItems = await fetchAllFragrancesFromMonday();

    const deletePromises = existingItems.map((item: any) => {
      const deleteMutation: string = `
        mutation {
          delete_item(item_id: ${item.id}) {
            id
          }
        }
      `;
      throttle(100);
      return mondayApiToken.post('', { query: deleteMutation });
    });

    await Promise.all(deletePromises);

    const dbFragrances: any = await sequelize.query('EXECUTE GetAllFragrances');

    for (const item of dbFragrances[0]) {
      const mutation: string = `
        mutation {
          create_item(
            board_id: ${boardId},
            item_name: "${item.id}",
            column_values: "${JSON.stringify({
              text8__1: item.name,
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
      await mondayApiToken.post('', { query: mutation });
      await throttle(300);
    }

    res.status(200).send('Fragrances synchronized successfully');
  } catch (error: any) {
    console.error('Error syncing data:', error);
    res.status(500).send(error);
  }
};

export const fetchAllFragrancesFromMonday = async (): Promise<any> => {
  const query = `
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

  const variables = { boardId: process.env.BOARD_ID_FRAGRANCES };

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

/** UTILITY FUNCTIONS */
const throttle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
