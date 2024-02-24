# Project Overview 
Airline Review RAG using OpenAI emnbeddings and chat completions to query a knowledge base in the form of a vector DB using Supabase's edge functions and pgvector functionality. Allowing for adnvanced knowledge retirival to answer quesions about customer expirience.     

## Airline Review Data: 
https://www.kaggle.com/datasets/dharun4772/british-airline-review-dataset    

## Data_Preprocessing.ipynb     
Handling Missing Values: Filled Nan values with "Unknown" for embedding  

Rating Encodings: Instead of numerical ratings, the numerical values were encoded to words generated from gpt to be embedded, with this prompt: "For each category in airline review data with ratings (-1, 1, 2, 3, 4, 5) provide one to two word labels that are infmorative to the customers expirience"  

Formatting Date Flown: Converted date from 'YYYY-MM-DD' format to 'DayOfWeek, MonthName Day(th/st/nd/rd), Year' format. This format is better suited for embeddings. 

Formatting Data for Embedding: In order to embed multiple columns of data, each column was seperated by it's label in capital letters, according to blog posts and openAI this is best practice for embeddings with multiple sections of information.     

## Data_Upload.ipynb     
PostgresSQL Table Set Up: With the pgvectors capabilities installed a table to store the embeddings were created with this query:  

''' CREATE TABLE airline_reviews (
  id bigserial PRIMARY KEY,
  input_content text,
  embedding vector(1536)
); ''' 

input_content contains the combined airline review data as text  
embedding contains the text-embedding-ada-002 embeddings with 1536 dimensions  

# Results (API Output)   
## Query 1
Question: "How were customers critical of our seats?" 

Answer: "Customers were critical of the airline's seating arrangements because their booked seats were reported as not available after they had waited for an hour at the check-in desk. They questioned why the airline would sell seats that they do not have available. They also rated seat comfort as unbearable."

## Query 2
Question: "Which route had the worst cabin service and why was it bad?"  

Answer: "The route that had the worst cabin service was from London to Santorini. The service was considered bad because customers reported that the plane was dirty, with someone else\'s belongings and leftover food still in their seat. Additionally, the flight was delayed by 3 hours and customers were unable to get water onboard. The overall experience was titled as "The worst experience" by the customers." 

## Query 3
Question: "If we are running a marketing campaign on how we are improving our service, which area should we focus this campaign on and how would we improve it?"  

Answer: "The marketing campaign should focus on improving the "Ground Service". The area of ground service seems to be an issue as a lot of customers have complained about it. Customers have trouble with overbooking and having to queue up for check-in even when without luggage, which they found inconvenient. In order to improve this, the airline company needs to revise its booking policy to avoid overbooking and implement efficient technology for online and self check-in at the airport. Regular training should also be conducted to ensure all ground service staff are responsive, helpful and attentive to customers\' needs. Additionally, value for money was rated as "Expensive", so the airline could also explore pricing strategies to improve perceived value." 

## Evaluating Results



