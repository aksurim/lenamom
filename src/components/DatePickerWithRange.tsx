"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: {
    from: Date | undefined;
    to: Date | undefined;
  };
  setDate: (date: { from: Date | undefined; to: Date | undefined }) => void;
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {

  // ALTERAÇÃO: Criada função para lidar com o onSelect
  const handleDateSelect = (range: DateRange | undefined) => {
    // Garante que o estado nunca seja undefined, mas sim um objeto com propriedades undefined
    setDate(range || { from: undefined, to: undefined });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[300px] justify-start text-left font-normal",
              !date?.from && "text-muted-foreground" // ALTERAÇÃO: Adicionado safe navigation
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? ( // ALTERAÇÃO: Adicionado safe navigation
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: ptBR })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: ptBR })
              )
            ) : (
              <span>Selecione uma data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from} // ALTERAÇÃO: Adicionado safe navigation
            selected={date as DateRange}
            onSelect={handleDateSelect} // ALTERAÇÃO: Usando o novo handler
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
