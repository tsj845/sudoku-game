from random import shuffle
from typing import List
from json import dumps
from sys import argv

Board = List[List[int]]

class Generator ():

    def __init__ (self, board : Board) -> None:
        self.board = board
        self.fill_remaining()
    
    def validate_contents (contents : List[int]) -> bool:
        for i in range(1, 10):
            if contents.count(i) > 1:
                return False
        return True
    
    def validate_box (board : Board, x : int, y : int) -> bool:
        contents = []
        for dy in range(3):
            for dx in range(3):
                contents.append(board[y*3+dy][x*3+dx])
        return Generator.validate_contents(contents)
    
    def validate_row (board : Board, y : int) -> bool:
        contents = []
        for x in range(9):
            contents.append(board[y][x])
        return Generator.validate_contents(contents)
    
    def validate_col (board : Board, x : int) -> bool:
        contents = []
        for y in range(9):
            contents.append(board[y][x])
        return Generator.validate_contents(contents)
    
    def validate_board (board : Board) -> bool:
        for y in range(9):
            if not Generator.validate_row(board, y):
                return False
        for x in range(9):
            if not Generator.validate_col(board, x):
                return False
        for y in range(3):
            for x in range(3):
                if not Generator.validate_box(board, x, y):
                    return False
        return True
    
    def check_box (self, y : int, x : int, num : int) -> bool:
        for i in range(3):
            for j in range(3):
                if self.board[y*3+i][x*3+j] == num:
                    return False
        return True
    
    def check_row (self, y : int, num : int) -> bool:
        for x in range(9):
            if self.board[y][x] == num:
                return False
        return True
    
    def check_col (self, x : int, num : int) -> bool:
        for y in range(9):
            if self.board[y][x] == num:
                return False
        return True
    
    def check_safe (self, y : int, x : int, num : int) -> bool:
        return self.check_box(int((y-y%3)/3), int((x-x%3)/3), num) and self.check_row(y, num) and self.check_col(x, num)
    
    def fill_remaining (self, y : int = 0, x : int = 0) -> bool:
        if x >= 9:
            if y < 8:
                y += 1
                x = 0
            else:
                return True
        
        if y < 3:
            if x < 3:
                x = 3
        elif y < 6:
            if x == 3:
                x += 3
        else:
            if x == 6:
                y += 1
                x = 0
                if y >= 9:
                    return True
        
        for num in range(1, 10):
            if self.check_safe(y, x, num):
                self.board[y][x] = num
                if self.fill_remaining(y, x + 1):
                    return True
                self.board[y][x] = 0

        return False
    
    def generate () -> Board:
        final_board : List[List[int]] = [[0 for i in range(9)] for i in range(9)]
        nums : List[int] = [x for x in range(1, 10)]
        
        # generate diagonal boxes
        for i in range(3):
            shuffle(nums)
            for j in range(9):
                final_board[i*3+int((j-(j%3))/3)][i*3+j%3] = nums[j]

        # much easier to do with instance due the the nature of the "fill_remaining" method
        g = Generator(final_board)

        return g.board

def print_board (board) -> None:
    for y in range(9):
        print(board[y])

board = Generator.generate()
print_board(board)

with open("out.json" if len(argv) == 1 else argv[1], "w") as f:
    f.write(dumps(board))