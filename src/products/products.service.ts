import { HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {


  private readonly logger = new Logger('ProductsService')


  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    })

  }

  async findAll(paginationDto: PaginationDto) {

    const { page = 1, limit = 10 } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);

    if (page > lastPage) {
      return {
        ok: false,
        error: 'Page number is too high'
      }
    }

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true }
      }),
      meta: {
        page: page,
        total: totalPages,
        lastPage: lastPage
      }
    }

  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: {
        id: id,
        available: true
      },
    });

    if (!product) throw new RpcException({ message: `Product with id #${id} not found or not available`, status: HttpStatus.BAD_REQUEST });
    return product;
  }

  async update(updateProductDto: UpdateProductDto) {

    const { id, ...rest } = updateProductDto;

    if (Object.keys(updateProductDto).length === 0) {
      return await this.findOne(id);
    }

    const prod = await this.product.findUnique({ where: { id: id } });
    if (!prod) throw new NotFoundException(`Product with id #${id} not found`);

    return this.product.update({
      where: { id: id },
      data: rest,
    })

  }

  async remove(id: number) {

    await this.findOne(id);

    // await this.product.delete({
    //   where: { id }
    // })

    const product = await this.product.update({
      where: { id: id },
      data: {
        available: false
      }
    })

    return 'Product was deleted'
  }


  async validateProducts(ids: number[]) {

    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    if (products.length !== ids.length) {

      throw new RpcException({ message: `Some products are not available`, status: HttpStatus.BAD_REQUEST })

    }
    return products;

  }
}
