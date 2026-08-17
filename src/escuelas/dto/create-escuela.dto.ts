import { IsNotEmpty, IsString } from "class-validator";
import { Not } from "typeorm";

export class CreateEscuelaDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    codigo: string;
}
