# Project Overview 
Airline Review RAG using OpenAI emnbeddings and chat completions to query a knowledge base in the form of a vector DB using Supabase's edge functions and pgvector functionality. Allowing for adnvanced knowledge retirival to answer quesions about customer expirience.     

## Airline Review Data: 
https://www.kaggle.com/datasets/dharun4772/british-airline-review-dataset    

## Data_Preprocessing.ipynb     
Handling Missing Values: Filled Nan values with "Unknown" for embedding  

Rating Encodings: Instead of numerical ratings, the numerical values were encoded to words generated from gpt to be embedded, with this prompt: "For each category in airline review data with ratings (-1, 1, 2, 3, 4, 5) provide one to two word labels that are infmorative to the customers expirience"   
```
seat_comfort_encoding = {
    -1: "Unbearable",
    1: "Uncomfortable",
    2: "Tolerable",
    3: "Adequate",
    4: "Comfortable",
    5: "Luxurious"
}

cabin_service_encoding = {
    -1: "Negligent",
    1: "Inadequate",
    2: "Basic",
    3: "Attentive",
    4: "Exceptional",
    5: "Outstanding"
}

entertainment_encoding = {
    -1: "Non-Existent",
    1: "Limitted",
    2: "Adequate",
    3: "Good",
    4: "Excellent",
    5: "Supberb"
}

ground_service_encoding ={
    -1: "Dismissive",
    1: "Unhelpful",
    2: "Sufficient",
    3: "Helpful",
    4: "Effecient",
    5: "Exceptional"
}

value_for_money_encoding = {
    -1: "Overpriced",
    1: "Expensive",
    2: "Fair",
    3: "Reasonable",
    4: "Good Value",
    5: "Excellent Value"
}
```

Formatting Date Flown: Converted date from 'YYYY-MM-DD' format to 'DayOfWeek, MonthName Day(th/st/nd/rd), Year' format. This format is better suited for embeddings. 

Formatting Data for Embedding: In order to embed multiple columns of data, each column was seperated by it's label in capital letters, according to blog posts and openAI this is best practice for embeddings with multiple sections of information.      

```
df['embedding_input'] = (
    "CUSTOMER INFORMATION - " + 
    "AIRCRAFT: " + df.aircraft.str.strip() +
    "; TRAVELER TYPE: " + df.traveller_type.str.strip() +
    "; SEAT TYPE: " + df.seat_type.str.strip() +
    "; ROUTE: " + df.route.str.strip() +
    "; DATE FLOWN: " + df.date_flown_formatted.str.strip() +
    ". REVIEW INFORMATION - " +
    "REVIEW TITLE: " + df.header.str.strip() +
    "; REVIEW CONTENT: " + df.content.str.strip() +
    "; SEAT COMFORT: " + df.seat_comfort.str.strip() +
    "; CABIN STAFF SERVICE: " + df.cabin_staff_service.str.strip() +
    "; ENTERTAINMENT: " + df.entertainment.str.strip() +
    "; GROUND SERVICE: " + df.ground_service.str.strip() +
    "; VALUE FOR MONEY: " + df.value_for_money.str.strip() +
    "; RECOMMENDED: " + df.recommended.str.strip()
)
```


## Data_Upload.ipynb     
PostgresSQL Table Set Up: With the pgvectors capabilities installed a table to store the embeddings were created with this query:  
``` 
CREATE TABLE airline_reviews (
  id bigserial PRIMARY KEY,
  input_content text,
  embedding vector(1536)
);  
``` 

input_content contains the combined airline review data as text  
embedding contains the text-embedding-ada-002 embeddings with 1536 dimensions    

## Edge Function and Data QA   
# Edge Function
In order to take a query and search the database for relevant information an edge function to match documents with cosine similarity was created via this postgresSQL query, which returns the top 10 most similar documents:   
```
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql stable
as $$
  select
    airline_reviews.id,
    airline_reviews.input_content,
    1 - (airline_reviews.embedding <=> query_embedding) as similarity
  from airline_reviews
  where airline_reviews.embedding <=> query_embedding < 1 - match_threshold
  order by airline_reviews.embedding <=> query_embedding
  limit match_count;
$$;
```
For this function to work our data needs to be indexed correclty, this postgresSQL query accomplishes this: 
```
create index on airline_reviews using ivfflat (embedding vector_cosine_ops)
with
  (lists = 100);
```
# Data QA ( Index.ts ) 
System Prompt: "You are a Customer Success Manager Assistant for an airline company with access to reviews left by customers. These reviews include information regarding the customer, the review they wrote, and the ratings they provided for different categories. Your job is to answer questions regarding customer expirience using the reviews left by customers."  

User Prompt:  
```
`Question: ${query} | Customer Reviews: ${contextText}`;
```
 ${query} contains the user question and ${contextText} contains the 10 most similar reviews to provide gpt with relevant information to answer the question.  


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



