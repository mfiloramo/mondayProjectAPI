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

export const fetchAllItemsFromMonday = async (boardId: string): Promise<any[]> => {
  let items: any[] = [];
  let cursor: string | null = null;

  do {
    const query = `
      query ($boardId: Int!, $cursor: String) {
        boards (ids: [$boardId]) {
          items_page (cursor: $cursor, limit: 100) {
            cursor
            items {
              id
              name
              column_values {
                column {
                  title
                }
                text
              }
            }
          }
        }
      }
    `;

    const variables: any = { boardId: parseInt(boardId, 10), cursor };

    const response: any = await mondayApiToken.post('', { query, variables });
    const data: any = response.data.data.boards[0].items_page;
    items = items.concat(data.items);
    cursor = data.cursor;
  } while (cursor);

  return items;
};

export const syncFragrances = async (): Promise<void> => {
  try {
    // Fetch all fragrances from the database
    const dbFragrances: any = await sequelize.query('EXECUTE GetAllFragrances');
    const dbFragranceMap: any = new Map(dbFragrances[0].map((item: any) => [item.name, item]));

    // Fetch all items from monday.com board
    const boardId = process.env.BOARD_ID_FRAGRANCES!;
    const mondayItems = await fetchAllItemsFromMonday(boardId);
    const mondayItemMap = new Map(mondayItems.map((item: any) => [item.name, item]));

    // Identify items to add, update, and delete
    const itemsToAdd = [];
    const itemsToUpdate = [];
    const itemsToDelete = [];

    // Determine items to add and update
    for (const [name, dbFragrance] of dbFragranceMap.entries()) {
      const mondayItem = mondayItemMap.get(name);
      if (mondayItem) {
        // Check if the item needs to be updated
        const columns = mondayItem.column_values.reduce((acc: any, cv: any) => {
          acc[cv.column.title.toLowerCase().replace(/ /g, "_")] = cv.text;
          return acc;
        }, {});

        const needsUpdate = ['description', 'category', 'image_url', 'created_at', 'updated_at'].some(field => columns[field] !== dbFragrance[field]);

        if (needsUpdate) {
          itemsToUpdate.push({ id: mondayItem.id, ...dbFragrance });
        }
      } else {
        // Item to add
        itemsToAdd.push(dbFragrance);
      }
    }

    // Determine items to delete
    for (const [name, mondayItem] of mondayItemMap.entries()) {
      if (!dbFragranceMap.has(name)) {
        itemsToDelete.push(mondayItem.id);
      }
    }

    // Perform add, update, delete operations
    const addPromises = itemsToAdd.map(item => {
      const mutation = `
        mutation {
          create_item (board_id: ${boardId}, item_name: "${item.name}", column_values: "${JSON.stringify({
        description: { text: item.description },
        category: { text: item.category },
        image_url: { text: item.image_url },
        created_at: { text: item.created_at },
        updated_at: { text: item.updated_at }
      }).replace(/"/g, '\\"')}")
          {
            id
            name
          }
        }`;
      return mondayApiToken.post('', { query: mutation });
    });

    const updatePromises = itemsToUpdate.map(item => {
      const mutation = `
        mutation {
          change_multiple_column_values (board_id: ${boardId}, item_id: ${item.id}, column_values: "${JSON.stringify({
        description: { text: item.description },
        category: { text: item.category },
        image_url: { text: item.image_url },
        updated_at: { text: item.updated_at }
      }).replace(/"/g, '\\"')}")
          {
            id
            name
          }
        }`;
      return mondayApiToken.post('', { query: mutation });
    });

    const deletePromises = itemsToDelete.map(itemId => {
      const mutation = `
        mutation {
          delete_item (item_id: ${itemId}) {
            id
          }
        }`;
      return mondayApiToken.post('', { query: mutation });
    });

    await Promise.all([...addPromises, ...updatePromises, ...deletePromises]);
  } catch (error: any) {
    console.error('Error syncing data:', error);
  }
};

// Function to add fragrance to monday.com
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