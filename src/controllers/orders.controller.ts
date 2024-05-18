import { Request, Response } from "express";
import { sequelize } from "../config/sequelize";


export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // SELECT ALL ORDERS IN DATABASE
    const selectAll = await sequelize.query('EXECUTE GetAllOrders')
    res.send(selectAll[0]);
    // ERROR HANDLING

  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
}

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    // ORDER DATA PAYLOAD
    const {
      first_name,
      last_name,
      number_of_kits,
      fragrance1_id,
      fragrance2_id,
      fragrance3_id
    } = req.body;

    // ADD ORDER TO DATABASE WHILE ENSURING DATA TYPE INTEGRITY
    const response = await sequelize.query(
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
    res.json(response[0]);
  } catch (error: any) {
    // ERROR HANDLING
    res.status(500).send(error);
    console.error(error);
  }
};


export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // ORDER DATA PAYLOAD
    const { id, status } = req.body;

    // UPDATE ORDER IN DATABASE
    const response = await sequelize.query('EXECUTE UpdateOrderStatus :id, :status',{
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
