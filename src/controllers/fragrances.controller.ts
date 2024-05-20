import { Request, Response } from 'express';
import { sequelize } from "../config/sequelize";
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as util from "node:util";

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
    // SELECT ALL ORDERS IN DATABASE
    const selectAll = await sequelize.query('EXECUTE GetAllFragrances');
    res.send(selectAll[0]);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
};

export const addFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    // FRAGRANCE DATA PAYLOAD
    const {
      name,
      description,
      category,
      created_at,
      updated_at,
      image_url
    } = req.body;

    // ADD FRAGRANCE TO DATABASE
    const response: any = await sequelize.query('EXECUTE AddFragrance :name, :description, :category, :created_at, :updated_at, :image_url', {
      replacements: { name, description, category, created_at, updated_at, image_url }
    });

    const fragranceId: number = response[0].id;

    // ADD FRAGRANCE TO MONDAY.COM BOARD
    const mutation: string = `
      mutation {
        create_item (
          board_id: ${ process.env.BOARD_ID_FRAGRANCES }, 
          item_name: "${ name }", 
          column_values: "${ JSON.stringify({
            name: { text: name },
            description: { text: description },
            category: { text: category },
            image_url: { text: image_url },
            created_at: { text: created_at },
            updated_at: { text: updated_at }
          }).replace(/"/g, '\\"') }"
        ) {
          id
          name
        }
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
};

export const updateFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, updated_at, image_url } = req.body;
    const { id } = req.params;

    // UPDATE FRAGRANCE IN DATABASE
    const response = await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url }
    });

    // UPDATE FRAGRANCE IN MONDAY.COM BOARD
    const mutation: string = `
      mutation {
        change_multiple_column_values (
          board_id: ${process.env.BOARD_ID_FRAGRANCES}, 
          item_id: ${id}, 
          column_values: "${JSON.stringify({
      description: { text: description },
      category: { text: category },
      image_url: { text: image_url },
      updated_at: { text: updated_at }
    }).replace(/"/g, '\\"')}"
        ) {
          id
          name
        }
      }`;

    if (apiToken) {
      const mondayResponse = await mondayApiToken.post('', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }

    res.json(response[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const deleteFragrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // DELETE FRAGRANCE FROM DATABASE
    await sequelize.query('EXECUTE DeleteFragrance :id', {
      replacements: { id }
    });

    // DELETE FRAGRANCE FROM MONDAY.COM BOARD
    const mutation: string = `
      mutation {
        delete_item (item_id: ${id}) {
          id
        }
      }`;

    if (apiToken) {
      const mondayResponse = await mondayApiToken.post('', { query: mutation });
      console.log("Monday API Response: ", mondayResponse.data);
    }

    res.json(`Fragrance ${id} deleted successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

// TODO: THIS BECOMES A CRON JOB
export const syncFragrances = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all items from Monday.com board
    const boardId = process.env.BOARD_ID_FRAGRANCES!;
    const existingItems = await fetchAllFragrancesFromMonday(req, res);

    // Delete all existing items from the board
    if (existingItems) {
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
    }

    // Fetch all fragrances from the database
    const dbFragrances: any = await sequelize.query('EXECUTE GetAllFragrances');

    // Iterate over the fetched fragrances and add them to Monday.com board
    if (dbFragrances[0]) {
      const addPromises = dbFragrances[0].map((item: any) => {
        const mutation = `
        mutation {
          create_item (
            board_id: ${ boardId },
            item_name: "${ item.name }",
            column_values: "${ JSON.stringify({
              name: { text: item.name },
              description: { text: item.description },
              category: { text: item.category },
              image_url: { text: item.image_url },
              created_at: { text: item.created_at },
              updated_at: { text: item.updated_at }
            }).replace(/"/g, '\\"') }"
          ) {
            id
            name
          }
        }`;
        return mondayApiToken.post('', { query: mutation });
      });

      await Promise.all(addPromises);
    }

    res.status(200).send('Fragrances synchronized successfully');
  } catch (error: any) {
    console.error('Error syncing data:', error);
    res.status(500).send(error);
  }
};

/** UTILITY FUNCTIONS */
const fetchAllFragrancesFromMonday = async (req: Request, res: Response): Promise<any> => {
  let items: any[] = [];
  let cursor: string | null = null;

  const query = `
      query {
        boards (ids: [${ process.env.BOARD_ID_FRAGRANCES }]) {
          items_page (limit: 100) {
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


  try {
    const response: any = await mondayApiToken.post('', { query, mondayApiToken });
    if (response.data.errors) {
      throw new Error(`Error fetching items: ${ response.data.errors[0].message }`);
    }

    const data: any = response.data.data.boards[0].items_page;
    if (data) {
      items = items.concat(data.items);
    } else {
      return;
    }
    return items;
  } catch (error) {
    console.error('Error fetching items from Monday.com:', error);
    throw error; // Rethrow the error to handle it in the caller function
  }
}

export const addFragranceToMonday = async (name: string, description: string, category: string, image_url: string, created_at: string, updated_at: string) => {
  const mutation = `
    mutation {
      create_item (
        board_id: ${process.env.BOARD_ID_FRAGRANCES}, 
        item_name: "${name}", 
        column_values: "${JSON.stringify({
    description: { text: description },
    category: { text: category },
    image_url: { text: image_url },
    created_at: { text: created_at },
    updated_at: { text: updated_at }
  }).replace(/"/g, '\\"')}"
      ) {
        id
        name
      }
    }`;
  return mondayApiToken.post('', { query: mutation });
};

// Function to update fragrance in monday.com
export const updateFragranceInMonday = async (id: number, description: string, category: string, image_url: string, updated_at: string) => {
  const mutation = `
    mutation {
      change_multiple_column_values (
        board_id: ${process.env.BOARD_ID_FRAGRANCES}, 
        item_id: ${id}, 
        column_values: "${JSON.stringify({
    description: { text: description },
    category: { text: category },
    image_url: { text: image_url },
    updated_at: { text: updated_at }
  }).replace(/"/g, '\\"')}"
      ) {
        id
        name
      }
    }`;
  return mondayApiToken.post('', { query: mutation });
};

// Function to delete fragrance from monday.com
export const deleteFragranceFromMonday = async (id: number) => {
  const mutation = `
    mutation {
      delete_item (item_id: ${id}) {
        id
      }
    }`;
  return mondayApiToken.post('', { query: mutation });
};